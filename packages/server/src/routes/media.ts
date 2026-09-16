import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import { rateLimit, sessionKey } from "../rateLimit";
import {
  assertUploadable,
  MAX_UPLOAD_BYTES,
  readImageDimensions,
  saveUploadedImage,
  sniffImageType,
} from "../media";

export const mediaRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");
const uploadRateLimit = rateLimit({ name: "media-upload", windowMs: 5 * 60_000, max: 30, keyFn: sessionKey });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

function handleUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      next(new AppError("VALIDATION", 422));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

interface MediaAssetRow {
  id: string;
  kind: string;
  path: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  mime_type: string;
  size_bytes: number;
  status: string;
  created_at: string;
}

function mapMediaAsset(row: MediaAssetRow) {
  return {
    id: row.id,
    kind: row.kind,
    url: row.url,
    altText: row.alt_text ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    createdAt: row.created_at,
  };
}

mediaRouter.post(
  "/admin/media",
  adminOnly,
  uploadRateLimit,
  handleUploadMiddleware,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw new AppError("VALIDATION", 422);

    const kind = assertUploadable(req.body?.kind);
    const altText = typeof req.body?.altText === "string" && req.body.altText.trim() ? req.body.altText.trim() : null;

    const sniffed = sniffImageType(file.buffer);
    if (!sniffed) throw new AppError("VALIDATION", 422);

    const dimensions = readImageDimensions(file.buffer, sniffed.mimeType);
    const { relativePath, url } = await saveUploadedImage(file.buffer, kind, sniffed);
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<MediaAssetRow>(
        `insert into media_assets (kind, path, url, alt_text, width, height, mime_type, size_bytes, uploaded_by_staff_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
        [
          kind,
          relativePath,
          url,
          altText,
          dimensions?.width ?? null,
          dimensions?.height ?? null,
          sniffed.mimeType,
          file.buffer.length,
          staffId,
        ],
      );
      const created = result.rows[0]!;
      await writeAuditLog(client, {
        action: "media.uploaded",
        actorStaffId: staffId,
        targetType: "media_asset",
        targetId: created.id,
        summary: `Загружено изображение (${kind})`,
        metadata: { mimeType: sniffed.mimeType, sizeBytes: file.buffer.length },
      });
      return created;
    });

    res.status(201).json(mapMediaAsset(row));
  }),
);

mediaRouter.delete(
  "/admin/media/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<MediaAssetRow>("select * from media_assets where id = $1", [
        req.params.id,
      ]);
      if (existing.rowCount === 0) throw new AppError("VALIDATION", 422);

      await client.query("update media_assets set status = 'archived' where id = $1", [req.params.id]);
      await writeAuditLog(client, {
        action: "media.removed",
        actorStaffId: staffId,
        targetType: "media_asset",
        targetId: String(req.params.id),
        summary: "Изображение удалено из каталога",
      });
    });
    res.status(204).send();
  }),
);
