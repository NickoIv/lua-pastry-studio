import { useState } from "react";
import { Button, NumericInput } from "@lua/ui";
import { ApiRequestError, type RewardInput } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";

export interface RewardFormValue {
  id?: string;
  titleRu: string;
  titleKk: string;
  titleEn: string;
  descriptionRu: string;
  pointsCost: number | null;
  active: boolean;
  perCustomerLimit: number | null;
  perCustomerLimitWindowDays: number | null;
  stock: number | null;
}

export interface RewardFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: RewardFormValue | null;
  onSubmit: (input: RewardInput) => Promise<unknown>;
}

const EMPTY: RewardFormValue = {
  titleRu: "",
  titleKk: "",
  titleEn: "",
  descriptionRu: "",
  pointsCost: 500,
  active: true,
  perCustomerLimit: null,
  perCustomerLimitWindowDays: null,
  stock: null,
};

export function RewardFormModal({ open, onClose, initial, onSubmit }: RewardFormModalProps) {
  const [value, setValue] = useState<RewardFormValue>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (open && initial?.id !== value.id) {
    setValue(initial ?? EMPTY);
  }

  async function handleSubmit() {
    if (!value.titleRu.trim()) {
      setError("Укажите название на русском.");
      return;
    }
    if (value.pointsCost === null || value.pointsCost <= 0) {
      setError("Укажите стоимость в баллах больше нуля.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: { ru: value.titleRu, kk: value.titleKk || value.titleRu, en: value.titleEn || value.titleRu },
        description: value.descriptionRu
          ? { ru: value.descriptionRu, kk: value.descriptionRu, en: value.descriptionRu }
          : undefined,
        pointsCost: value.pointsCost,
        active: value.active,
        perCustomerLimit: value.perCustomerLimit,
        perCustomerLimitWindowDays: value.perCustomerLimitWindowDays,
        stock: value.stock,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить награду");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать награду" : "Новая награда"}
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
      <FormField label="Название (RU)" htmlFor="reward-title-ru">
        <input
          id="reward-title-ru"
          type="text"
          value={value.titleRu}
          onChange={(e) => setValue((v) => ({ ...v, titleRu: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Название (KK)" htmlFor="reward-title-kk">
          <input
            id="reward-title-kk"
            type="text"
            value={value.titleKk}
            onChange={(e) => setValue((v) => ({ ...v, titleKk: e.target.value }))}
          />
        </FormField>
        <FormField label="Название (EN)" htmlFor="reward-title-en">
          <input
            id="reward-title-en"
            type="text"
            value={value.titleEn}
            onChange={(e) => setValue((v) => ({ ...v, titleEn: e.target.value }))}
          />
        </FormField>
      </div>
      <FormField label="Описание (RU)" htmlFor="reward-desc">
        <textarea
          id="reward-desc"
          value={value.descriptionRu}
          onChange={(e) => setValue((v) => ({ ...v, descriptionRu: e.target.value }))}
        />
      </FormField>
      <FormField
        label="Стоимость, баллы"
        htmlFor="reward-cost"
        hint="Изменение цены не затрагивает уже созданные (PENDING) обмены — они сохраняют исходную стоимость."
      >
        <NumericInput
          id="reward-cost"
          value={value.pointsCost}
          onChange={(pointsCost) => setValue((v) => ({ ...v, pointsCost }))}
          placeholder="500"
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Лимит на клиента" htmlFor="reward-limit" hint="Пусто — без ограничений">
          <NumericInput
            id="reward-limit"
            value={value.perCustomerLimit}
            onChange={(perCustomerLimit) => setValue((v) => ({ ...v, perCustomerLimit }))}
          />
        </FormField>
        <FormField label="Окно, дней" htmlFor="reward-window">
          <NumericInput
            id="reward-window"
            value={value.perCustomerLimitWindowDays}
            onChange={(perCustomerLimitWindowDays) => setValue((v) => ({ ...v, perCustomerLimitWindowDays }))}
          />
        </FormField>
      </div>
      <label className="lua-form-checkbox">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))}
        />
        Активна (доступна для обмена)
      </label>
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
