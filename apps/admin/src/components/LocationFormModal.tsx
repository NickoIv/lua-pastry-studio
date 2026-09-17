import { useState } from "react";
import { Button } from "@lua/ui";
import { ApiRequestError, type LocationInput } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";

export interface LocationFormValue {
  id?: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
  phone: string;
  openHours: string;
  sortOrder: number;
  isActive: boolean;
}

export interface LocationFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: LocationFormValue | null;
  onCreate: (input: LocationInput) => Promise<unknown>;
  onUpdate: (id: string, patch: Partial<LocationInput>) => Promise<unknown>;
}

const EMPTY: LocationFormValue = {
  name: "",
  shortName: "",
  address: "",
  city: "Алматы",
  phone: "",
  openHours: "08:00–22:00",
  sortOrder: 0,
  isActive: true,
};

/**
 * Locations are real Admin data now, not hardcoded seed values — see
 * product brief §4. Editing here propagates everywhere `/locations` is
 * read (Admin tables, Staff, Guest's location selector, product
 * availability) since they all read the same row.
 */
export function LocationFormModal({ open, onClose, initial, onCreate, onUpdate }: LocationFormModalProps) {
  const [value, setValue] = useState<LocationFormValue>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (open && initial?.id !== value.id) {
    setValue(initial ?? EMPTY);
  }

  async function handleSubmit() {
    if (!value.shortName.trim()) {
      setError("Укажите короткое название (например «Достык»).");
      return;
    }
    if (!value.name.trim() || !value.address.trim() || !value.openHours.trim()) {
      setError("Заполните полное название, адрес и часы работы.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input: LocationInput = {
        name: value.name.trim(),
        shortName: value.shortName.trim(),
        address: value.address.trim(),
        city: value.city.trim(),
        phone: value.phone.trim() || undefined,
        openHours: value.openHours.trim(),
        sortOrder: value.sortOrder,
        isActive: value.isActive,
      };
      if (initial?.id) {
        await onUpdate(initial.id, input);
      } else {
        await onCreate(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить точку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать точку" : "Новая точка"}
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
      <div className="lua-form-row">
        <FormField label="Короткое название" htmlFor="loc-short-name" hint="Показывается в таблицах и на Guest">
          <input
            id="loc-short-name"
            type="text"
            value={value.shortName}
            onChange={(e) => setValue((v) => ({ ...v, shortName: e.target.value }))}
            placeholder="Достык"
          />
        </FormField>
        <FormField label="Полное название" htmlFor="loc-name">
          <input
            id="loc-name"
            type="text"
            value={value.name}
            onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
            placeholder="Lua Pastry Studio — Достык"
          />
        </FormField>
      </div>
      <FormField label="Адрес" htmlFor="loc-address">
        <input
          id="loc-address"
          type="text"
          value={value.address}
          onChange={(e) => setValue((v) => ({ ...v, address: e.target.value }))}
        />
      </FormField>
      <div className="lua-form-row">
        <FormField label="Город" htmlFor="loc-city">
          <input id="loc-city" type="text" value={value.city} onChange={(e) => setValue((v) => ({ ...v, city: e.target.value }))} />
        </FormField>
        <FormField label="Телефон" htmlFor="loc-phone" hint="Необязательно">
          <input id="loc-phone" type="text" value={value.phone} onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))} />
        </FormField>
      </div>
      <div className="lua-form-row">
        <FormField label="Часы работы" htmlFor="loc-hours">
          <input
            id="loc-hours"
            type="text"
            value={value.openHours}
            onChange={(e) => setValue((v) => ({ ...v, openHours: e.target.value }))}
            placeholder="08:00–22:00"
          />
        </FormField>
        <FormField label="Порядок сортировки" htmlFor="loc-sort">
          <input
            id="loc-sort"
            type="number"
            min={0}
            value={value.sortOrder}
            onChange={(e) => setValue((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
          />
        </FormField>
      </div>
      <label className="lua-form-checkbox">
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(e) => setValue((v) => ({ ...v, isActive: e.target.checked }))}
        />
        Активна
      </label>
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
