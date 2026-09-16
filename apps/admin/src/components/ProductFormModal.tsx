import { useState } from "react";
import { Button } from "@lua/ui";
import { ApiRequestError, type ProductInput, type ServerCategory } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";

export interface ProductFormValue {
  id?: string;
  categoryId: string;
  nameRu: string;
  nameKk: string;
  nameEn: string;
  descriptionRu: string;
  descriptionKk: string;
  descriptionEn: string;
  price: number;
  allergens: string;
  isSeasonal: boolean;
  isNew: boolean;
  isMustTry: boolean;
  active: boolean;
  imageUrl: string;
}

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: ProductFormValue | null;
  categories: ServerCategory[];
  onSubmit: (input: ProductInput) => Promise<unknown>;
}

function emptyValue(defaultCategoryId: string): ProductFormValue {
  return {
    categoryId: defaultCategoryId,
    nameRu: "",
    nameKk: "",
    nameEn: "",
    descriptionRu: "",
    descriptionKk: "",
    descriptionEn: "",
    price: 0,
    allergens: "",
    isSeasonal: false,
    isNew: false,
    isMustTry: false,
    active: true,
    imageUrl: "",
  };
}

export function ProductFormModal({ open, onClose, initial, categories, onSubmit }: ProductFormModalProps) {
  const fallback = emptyValue(categories[0]?.id ?? "");
  const [value, setValue] = useState<ProductFormValue>(initial ?? fallback);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageAltText, setImageAltText] = useState("");
  // Re-seeds when editing a different row, and also when the categories
  // list (loaded async) finally arrives after this modal already
  // mounted with an empty default categoryId — otherwise "new product"
  // can be stuck with an unselectable categoryId of "" forever.
  if (open && (initial?.id !== value.id || (!value.id && !value.categoryId && categories.length > 0))) {
    setValue(initial ?? fallback);
  }

  async function handleSubmit() {
    if (!value.nameRu.trim()) {
      setError("Укажите название на русском.");
      return;
    }
    if (!value.categoryId) {
      setError("Выберите категорию.");
      return;
    }
    if (!Number.isFinite(value.price) || value.price <= 0) {
      setError("Укажите цену больше нуля.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        categoryId: value.categoryId,
        name: { ru: value.nameRu, kk: value.nameKk || value.nameRu, en: value.nameEn || value.nameRu },
        description: value.descriptionRu
          ? { ru: value.descriptionRu, kk: value.descriptionKk || value.descriptionRu, en: value.descriptionEn || value.descriptionRu }
          : undefined,
        price: value.price,
        allergens: value.allergens
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        isSeasonal: value.isSeasonal,
        isNew: value.isNew,
        isMustTry: value.isMustTry,
        active: value.active,
        imageUrl: value.imageUrl || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить товар");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать товар" : "Новый товар"}
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
      <FormField label="Название (RU)" htmlFor="prod-name-ru">
        <input
          id="prod-name-ru"
          type="text"
          value={value.nameRu}
          onChange={(e) => setValue((v) => ({ ...v, nameRu: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Название (KK)" htmlFor="prod-name-kk">
          <input
            id="prod-name-kk"
            type="text"
            value={value.nameKk}
            onChange={(e) => setValue((v) => ({ ...v, nameKk: e.target.value }))}
          />
        </FormField>
        <FormField label="Название (EN)" htmlFor="prod-name-en">
          <input
            id="prod-name-en"
            type="text"
            value={value.nameEn}
            onChange={(e) => setValue((v) => ({ ...v, nameEn: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Описание (RU)" htmlFor="prod-desc-ru">
        <textarea
          id="prod-desc-ru"
          value={value.descriptionRu}
          onChange={(e) => setValue((v) => ({ ...v, descriptionRu: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Категория" htmlFor="prod-category">
          <select
            id="prod-category"
            value={value.categoryId}
            onChange={(e) => setValue((v) => ({ ...v, categoryId: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.ru}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Цена, ₸" htmlFor="prod-price">
          <input
            id="prod-price"
            type="number"
            min={0}
            step={50}
            value={value.price}
            onChange={(e) => setValue((v) => ({ ...v, price: Number(e.target.value) }))}
          />
        </FormField>
      </div>
      <FormField label="Аллергены" htmlFor="prod-allergens" hint="Через запятую, например: молоко, орехи">
        <input
          id="prod-allergens"
          type="text"
          value={value.allergens}
          onChange={(e) => setValue((v) => ({ ...v, allergens: e.target.value }))}
        />
      </FormField>
      <ImageUploadField
        kind="product"
        imageUrl={value.imageUrl}
        altText={imageAltText}
        onImageUrlChange={(url) => setValue((v) => ({ ...v, imageUrl: url }))}
        onAltTextChange={setImageAltText}
      />
      <div className="lua-form-row">
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.isNew}
            onChange={(e) => setValue((v) => ({ ...v, isNew: e.target.checked }))}
          />
          Новинка
        </label>
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.isMustTry}
            onChange={(e) => setValue((v) => ({ ...v, isMustTry: e.target.checked }))}
          />
          Must Try
        </label>
      </div>
      <div className="lua-form-row">
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.isSeasonal}
            onChange={(e) => setValue((v) => ({ ...v, isSeasonal: e.target.checked }))}
          />
          Сезонное
        </label>
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))}
          />
          Активен (виден в Lua Guest)
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
