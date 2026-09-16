import { useRef, useState } from "react";
import { Button } from "@lua/ui";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { ImageSurface } from "@lua/ui";
import { resolveMediaUrl } from "@lua/config";
import { FormField } from "./FormField";
import { useUploadMedia } from "../data/hooks";

export interface ImageUploadFieldProps {
  kind: "product" | "collection";
  imageUrl: string;
  altText: string;
  onImageUrlChange: (url: string) => void;
  onAltTextChange: (altText: string) => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Local upload only — no Cloudinary/S3 — see docs/ARCHITECTURE.md "Media foundation". */
export function ImageUploadField({ kind, imageUrl, altText, onImageUrlChange, onAltTextChange }: ImageUploadFieldProps) {
  const uploadMedia = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const asset = await uploadMedia(file, kind, altText || undefined);
      onImageUrlChange(asset.url);
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось загрузить изображение");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <FormField label="Изображение" htmlFor="media-upload-input">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 96, flexShrink: 0 }}>
          <ImageSurface aspectRatio="1 / 1" src={resolveMediaUrl(imageUrl || undefined)} label={altText || "Изображение"} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? "Загрузка…" : imageUrl ? "Заменить" : "Загрузить"}
            </Button>
            {imageUrl ? (
              <Button variant="ghost" onClick={() => onImageUrlChange("")} disabled={busy}>
                Удалить
              </Button>
            ) : null}
          </div>
          <input
            id="media-upload-input"
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <input
            type="text"
            placeholder="Alt-текст (для доступности)"
            value={altText}
            onChange={(e) => onAltTextChange(e.target.value)}
          />
          <input
            type="url"
            placeholder="или вставьте внешнюю ссылку на изображение"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
          />
          {error ? <p className="lua-form-field__error">{error}</p> : null}
        </div>
      </div>
    </FormField>
  );
}
