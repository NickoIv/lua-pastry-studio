import { useState } from "react";
import { Button } from "@lua/ui";
import { ApiRequestError, type CategoryInput } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";

export interface CategoryFormValue {
  id?: string;
  nameRu: string;
  nameKk: string;
  nameEn: string;
  sortOrder: number;
  active: boolean;
}

export interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: CategoryFormValue | null;
  onSubmit: (input: CategoryInput) => Promise<unknown>;
}

const EMPTY: CategoryFormValue = { nameRu: "", nameKk: "", nameEn: "", sortOrder: 0, active: true };

export function CategoryFormModal({ open, onClose, initial, onSubmit }: CategoryFormModalProps) {
  const [value, setValue] = useState<CategoryFormValue>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (open && initial?.id !== value.id) {
    // Re-seed the form when a different row is opened for editing —
    // cheap enough to do during render; avoids a stale-closure effect.
    setValue(initial ?? EMPTY);
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
        sortOrder: value.sortOrder,
        active: value.active,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить категорию");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать категорию" : "Новая категория"}
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
      <FormField label="Название (RU)" htmlFor="cat-name-ru">
        <input
          id="cat-name-ru"
          type="text"
          value={value.nameRu}
          onChange={(e) => setValue((v) => ({ ...v, nameRu: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Название (KK)" htmlFor="cat-name-kk">
          <input
            id="cat-name-kk"
            type="text"
            value={value.nameKk}
            onChange={(e) => setValue((v) => ({ ...v, nameKk: e.target.value }))}
          />
        </FormField>
        <FormField label="Название (EN)" htmlFor="cat-name-en">
          <input
            id="cat-name-en"
            type="text"
            value={value.nameEn}
            onChange={(e) => setValue((v) => ({ ...v, nameEn: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Порядок сортировки" htmlFor="cat-sort">
        <input
          id="cat-sort"
          type="number"
          min={0}
          value={value.sortOrder}
          onChange={(e) => setValue((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
        />
      </FormField>
      <label className="lua-form-checkbox">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))}
        />
        Активна (видна в Lua Guest)
      </label>
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
