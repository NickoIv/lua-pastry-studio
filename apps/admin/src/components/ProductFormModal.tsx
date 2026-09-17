import { useState } from "react";
import { Button, NumericInput } from "@lua/ui";
import { ApiRequestError, type ProductInput, type ServerCategory } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { ImageUploadField } from "./ImageUploadField";
import { AllergenInput } from "./AllergenInput";

export interface ProductFormValue {
  id?: string;
  categoryId: string;
  nameRu: string;
  nameKk: string;
  nameEn: string;
  descriptionRu: string;
  descriptionKk: string;
  descriptionEn: string;
  price: number | null;
  allergens: string[];
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
    price: null,
    allergens: [],
    isSeasonal: false,
    isNew: false,
    isMustTry: false,
    active: true,
    imageUrl: "",
  };
}

type LangTab = "ru" | "kk" | "en";
const LANG_TAB_LABEL: Record<LangTab, string> = { ru: "Русский", kk: "Қазақша", en: "English" };

export function ProductFormModal({ open, onClose, initial, categories, onSubmit }: ProductFormModalProps) {
  const fallback = emptyValue(categories[0]?.id ?? "");
  const [value, setValue] = useState<ProductFormValue>(initial ?? fallback);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageAltText, setImageAltText] = useState("");
  const [langTab, setLangTab] = useState<LangTab>("ru");
  // Re-seeds when editing a different row, and also when the categories
  // list (loaded async) finally arrives after this modal already
  // mounted with an empty default categoryId — otherwise "new product"
  // can be stuck with an unselectable categoryId of "" forever.
  if (open && (initial?.id !== value.id || (!value.id && !value.categoryId && categories.length > 0))) {
    setValue(initial ?? fallback);
    setLangTab("ru");
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
    if (value.price === null || value.price <= 0) {
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
        allergens: value.allergens,
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

  const nameField: Record<LangTab, keyof ProductFormValue> = { ru: "nameRu", kk: "nameKk", en: "nameEn" };
  const descField: Record<LangTab, keyof ProductFormValue> = {
    ru: "descriptionRu",
    kk: "descriptionKk",
    en: "descriptionEn",
  };

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
      <div className="lua-lang-tabs" role="tablist" aria-label="Язык">
        {(Object.keys(LANG_TAB_LABEL) as LangTab[]).map((lang) => (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={langTab === lang}
            className={`lua-lang-tabs__tab${langTab === lang ? " lua-lang-tabs__tab--active" : ""}`}
            onClick={() => setLangTab(lang)}
          >
            {LANG_TAB_LABEL[lang]}
            {lang === "ru" ? " *" : ""}
          </button>
        ))}
      </div>

      <FormField label={`Название (${LANG_TAB_LABEL[langTab]})`} htmlFor="prod-name">
        <input
          id="prod-name"
          type="text"
          value={value[nameField[langTab]] as string}
          onChange={(e) => setValue((v) => ({ ...v, [nameField[langTab]]: e.target.value }))}
        />
      </FormField>
      <FormField label={`Описание (${LANG_TAB_LABEL[langTab]})`} htmlFor="prod-desc">
        <textarea
          id="prod-desc"
          value={value[descField[langTab]] as string}
          onChange={(e) => setValue((v) => ({ ...v, [descField[langTab]]: e.target.value }))}
        />
      </FormField>
      {langTab !== "ru" ? (
        <p className="lua-form-field__hint" style={{ margin: "-8px 0 16px" }}>
          Пусто — будет показан русский вариант.
        </p>
      ) : null}

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
          <NumericInput id="prod-price" value={value.price} onChange={(price) => setValue((v) => ({ ...v, price }))} placeholder="1900" />
        </FormField>
      </div>
      <AllergenInput
        value={value.allergens}
        onChange={(allergens) => setValue((v) => ({ ...v, allergens }))}
      />
      <ImageUploadField
        kind="product"
        imageUrl={value.imageUrl}
        altText={imageAltText || value.nameRu}
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
