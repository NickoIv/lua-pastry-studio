import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./errors";
import { env } from "./env";

/**
 * Local media upload foundation — no Cloudinary/S3/Supabase Storage.
 * Runtime uploads live outside the repo tree conceptually (gitignored)
 * even though the directory sits inside packages/server for simplicity;
 * see docs/ARCHITECTURE.md "Media foundation" for the repository-asset
 * vs runtime-upload split.
 */
const SERVER_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const UPLOAD_ROOT = env.mediaUploadDir
  ? path.resolve(env.mediaUploadDir)
  : path.join(SERVER_ROOT, "uploads");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB — plenty for a web product photo, not a raw camera original.

export type MediaKind = "product" | "collection";

interface SniffedType {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}

/**
 * Identifies the file from its actual bytes (magic numbers), never the
 * client-supplied Content-Type/filename — a spoofed extension or MIME
 * header is a classic upload-bypass vector. Only the three raster
 * formats a product photo needs are accepted; notably no SVG (XSS via
 * embedded script) and nothing else.
 */
export function sniffImageType(buffer: Buffer): SniffedType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

/** PNG/JPEG/WEBP dimensions read straight from each format's header — no image-processing dependency needed for just this. */
export function readImageDimensions(buffer: Buffer, mimeType: SniffedType["mimeType"]): { width: number; height: number } | null {
  try {
    if (mimeType === "image/png") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (mimeType === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1]!;
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
      return null;
    }
    if (mimeType === "image/webp") {
      const format = buffer.toString("ascii", 12, 16);
      if (format === "VP8X") {
        const width = 1 + (buffer[24]! | (buffer[25]! << 8) | (buffer[26]! << 16));
        const height = 1 + (buffer[27]! | (buffer[28]! << 8) | (buffer[29]! << 16));
        return { width, height };
      }
      if (format === "VP8 ") {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

export function assertUploadable(kind: unknown): MediaKind {
  if (kind !== "product" && kind !== "collection") {
    throw new AppError("VALIDATION", 422);
  }
  return kind;
}

/**
 * Writes the sniffed-and-validated buffer under a server-generated
 * random filename — the client's original filename is never used to
 * build a path, so there's no path-traversal surface (`../../etc/passwd`,
 * absolute paths, null bytes) to sanitize in the first place.
 */
export async function saveUploadedImage(
  buffer: Buffer,
  kind: MediaKind,
  sniffed: SniffedType,
): Promise<{ relativePath: string; url: string }> {
  const dir = path.join(UPLOAD_ROOT, kind);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${sniffed.extension}`;
  await writeFile(path.join(dir, filename), buffer, { mode: 0o644 });
  const relativePath = path.posix.join(kind, filename);
  return { relativePath, url: `/media/${relativePath}` };
}

export async function deleteUploadedImage(relativePath: string): Promise<void> {
  const resolved = path.resolve(UPLOAD_ROOT, relativePath);
  // Defense in depth: refuse to unlink anything that normalized outside
  // the upload root, even though relativePath only ever comes from a
  // value this module itself generated and stored.
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) return;
  await unlink(resolved).catch(() => undefined);
}
