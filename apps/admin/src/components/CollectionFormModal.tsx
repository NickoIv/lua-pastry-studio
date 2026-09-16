import { useState } from "react";
import { Button } from "@lua/ui";
import { ApiRequestError, type CollectionInput, type ServerProduct } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";

export interface CollectionFormValue {
  id?: string;
  nameRu: string;
  nameKk: string;
  nameEn: string;
  subtitleRu: string;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  productIds: string[];
  imageUrl: string;
}

export interface CollectionFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: CollectionFormValue | null;
  products: ServerProduct[];
  onSubmit: (input: CollectionInput) => Promise<unknown>;
}

const EMPTY: CollectionFormValue = {
  nameRu: "",
  nameKk: "",
  nameEn: "",
  subtitleRu: "",
  sortOrder: 0,
  active: true,
  featured: false,
  productIds: [],
  imageUrl: "",
};

export function CollectionFormModal({ open, onClose, initial, products, onSubmit }: CollectionFormModalProps) {
  const [value, setValue] = useState<CollectionFormValue>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageAltText, setImageAltText] = useState("");

  if (open && initial?.id !== value.id) {
    setValue(initial ?? EMPTY);
  }

  function toggleProduct(id: string) {
    setValue((v) => ({
      ...v,
      productIds: v.productIds.includes(id) ? v.productIds.filter((p) => p !== id) : [...v.productIds, id],
    }));
  }

  async function handleSubmit() {
    if (!value.nameRu.trim()) {
      setError("Укажите название на русском.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: { ru: value.nameRu, kk: value.nameKk || value.nameRu, en: value.nameEn || value.nameRu },
        subtitle: value.subtitleRu
          ? { ru: value.subtitleRu, kk: value.subtitleRu, en: value.subtitleRu }
          : undefined,
        sortOrder: value.sortOrder,
        active: value.active,
        featured: value.featured,
        productIds: value.productIds,
        imageUrl: value.imageUrl || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить коллекцию");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать коллекцию" : "Новая коллекция"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? "Сохранение…" : "Сохранить"}
          </Button>
        </>
      }
    >
      <FormField label="Название (RU)" htmlFor="col-name-ru">
        <input
          id="col-name-ru"
          type="text"
          value={value.nameRu}
          onChange={(e) => setValue((v) => ({ ...v, nameRu: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Название (KK)" htmlFor="col-name-kk">
          <input
            id="col-name-kk"
            type="text"
            value={value.nameKk}
            onChange={(e) => setValue((v) => ({ ...v, nameKk: e.target.value }))}
          />
        </FormField>
        <FormField label="Название (EN)" htmlFor="col-name-en">
          <input
            id="col-name-en"
            type="text"
            value={value.nameEn}
            onChange={(e) => setValue((v) => ({ ...v, nameEn: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Подзаголовок" htmlFor="col-subtitle">
        <input
          id="col-subtitle"
          type="text"
          value={value.subtitleRu}
          onChange={(e) => setValue((v) => ({ ...v, subtitleRu: e.target.value }))}
        />
      </FormField>
      <ImageUploadField
        kind="collection"
        imageUrl={value.imageUrl}
        altText={imageAltText}
        onImageUrlChange={(url) => setValue((v) => ({ ...v, imageUrl: url }))}
        onAltTextChange={setImageAltText}
      />
      <FormField label="Товары в коллекции" htmlFor="col-products">
        <div
          id="col-products"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid var(--lua-color-border)",
            borderRadius: "var(--lua-radius-sm)",
            padding: "var(--lua-space-xs)",
          }}
        >
          {products.map((p) => (
            <label key={p.id} className="lua-form-checkbox" style={{ minHeight: "auto", padding: "2px 0" }}>
              <input type="checkbox" checked={value.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
              {p.name.ru}
            </label>
          ))}
        </div>
      </FormField>
      <div className="lua-form-row">
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.featured}
            onChange={(e) => setValue((v) => ({ ...v, featured: e.target.checked }))}
          />
          Featured (на Home)
        </label>
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))}
          />
          Активна
        </label>
      </div>
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
