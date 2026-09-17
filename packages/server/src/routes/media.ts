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
  deleteUploadedImage,
  MAX_UPLOAD_BYTES,
  optimizeImage,
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
  original_mime_type: string | null;
  original_size_bytes: number | null;
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
    originalMimeType: row.original_mime_type ?? undefined,
    originalSizeBytes: row.original_size_bytes ?? undefined,
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

    // Every upload gets normalized to WebP regardless of what came in —
    // see docs/ARCHITECTURE.md "Media foundation" / product brief §16.
    const optimized = await optimizeImage(file.buffer);
    const { relativePath, url } = await saveUploadedImage(optimized.buffer, kind, "webp");
    const staffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<MediaAssetRow>(
        `insert into media_assets (kind, path, url, alt_text, width, height, mime_type, size_bytes, original_mime_type, original_size_bytes, uploaded_by_staff_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *`,
        [
          kind,
          relativePath,
          url,
          altText,
          optimized.width,
          optimized.height,
          "image/webp",
          optimized.buffer.length,
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

/**
 * Safe delete: an asset still referenced by a product or collection is
 * never silently unlinked or removed. The `media_asset_id` FK
 * (infra/db/migrations/019_media_asset_fk.sql) already refuses this at
 * the database level (a plain RESTRICT, no ON DELETE clause), but the
 * pre-check here exists to turn that into the friendly, specific
 * message the task calls for — "used by: <names>" — instead of a raw
 * `23503` making it back to the admin. Only once nothing references the
 * asset does this remove both the row and the file on disk.
 */
mediaRouter.delete(
  "/admin/media/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    await withRole("app_admin", { staffId }, async (client) => {
      const existing = await client.query<MediaAssetRow>("select * from media_assets where id = $1", [
        req.params.id,
      ]);
      if (existing.rowCount === 0) throw new AppError("MEDIA_ASSET_NOT_FOUND", 404);
      const asset = existing.rows[0]!;

      const [inUseProducts, inUseCollections] = await Promise.all([
        client.query<{ name: Record<string, string> }>(
          "select name from products where media_asset_id = $1",
          [asset.id],
        ),
        client.query<{ name: Record<string, string> }>(
          "select name from collections where media_asset_id = $1",
          [asset.id],
        ),
      ]);
      const names = [...inUseProducts.rows, ...inUseCollections.rows].map((r) => r.name.ru);
      if (names.length > 0) {
        throw new AppError(
          "MEDIA_ASSET_IN_USE",
          409,
          `Изображение используется в: ${names.map((n) => `«${n}»`).join(", ")}. Замените или удалите изображение в этих карточках, чтобы его удалить.`,
        );
      }

      try {
        await client.query("delete from media_assets where id = $1", [asset.id]);
      } catch (error) {
        const pgError = error as { code?: string };
        if (pgError.code === "23503") throw new AppError("MEDIA_ASSET_IN_USE", 409);
        throw error;
      }
      await deleteUploadedImage(asset.path);

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
