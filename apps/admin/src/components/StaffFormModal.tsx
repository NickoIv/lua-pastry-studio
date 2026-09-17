import { useState } from "react";
import { Button, NumericInput } from "@lua/ui";
import { ApiRequestError, type ServerLocation, type StaffCreateInput, type StaffUpdateInput } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU, ROLES } from "@lua/types";

import { Modal } from "./Modal";
import { FormField } from "./FormField";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
};

// OWNER is never offered here — see docs/ARCHITECTURE.md "Staff
// management & OWNER protection". The server independently refuses it
// too (both at the API layer and inside the DB function), so this is
// just keeping the UI honest about what will actually succeed.
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "OWNER");

export interface StaffFormValue {
  id?: string;
  displayName: string;
  role: string;
  active: boolean;
  locationId: string;
  locationIds: string[];
}

export interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: StaffFormValue | null;
  locations: ServerLocation[];
  onCreate: (input: StaffCreateInput) => Promise<unknown>;
  onUpdate: (id: string, patch: StaffUpdateInput) => Promise<unknown>;
  onSetLocations: (id: string, locationIds: string[], primaryLocationId: string) => Promise<unknown>;
}

function emptyValue(defaultLocationId: string): StaffFormValue {
  return {
    displayName: "",
    role: "BARISTA",
    active: true,
    locationId: defaultLocationId,
    locationIds: defaultLocationId ? [defaultLocationId] : [],
  };
}

/**
 * Default flow is a staff code + PIN — no individual work email
 * required (product brief §6). Email/password remain available as an
 * optional, secondary, one-time-at-creation field for anyone who wants
 * a real login (e.g. an ADMIN), tucked under "Дополнительно" so it
 * never reads as the normal path.
 */
export function StaffFormModal({
  open,
  onClose,
  initial,
  locations,
  onCreate,
  onUpdate,
  onSetLocations,
}: StaffFormModalProps) {
  const fallback = emptyValue(locations[0]?.id ?? "");
  const [value, setValue] = useState<StaffFormValue>(initial ?? fallback);
  const [staffCode, setStaffCode] = useState("");
  const [pin, setPin] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (open && (initial?.id !== value.id || (!value.id && value.locationIds.length === 0 && locations.length > 0))) {
    setValue(initial ?? fallback);
    if (!initial) {
      setStaffCode("");
      setPin(null);
      setEmail("");
      setPassword("");
      setShowAdvanced(false);
    }
  }

  function toggleLocation(locationId: string) {
    setValue((v) => {
      const has = v.locationIds.includes(locationId);
      const nextIds = has ? v.locationIds.filter((id) => id !== locationId) : [...v.locationIds, locationId];
      const nextPrimary = v.locationId && nextIds.includes(v.locationId) ? v.locationId : (nextIds[0] ?? "");
      return { ...v, locationIds: nextIds, locationId: nextPrimary };
    });
  }

  async function handleSubmit() {
    if (!value.displayName.trim()) {
      setError("Укажите имя сотрудника.");
      return;
    }
    if (value.locationIds.length === 0) {
      setError("Выберите хотя бы одну точку.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (initial?.id) {
        await onUpdate(initial.id, {
          displayName: value.displayName,
          role: value.role,
          active: value.active,
        });
        const initialIds = [...initial.locationIds].sort().join(",");
        const nextIds = [...value.locationIds].sort().join(",");
        if (initialIds !== nextIds || initial.locationId !== value.locationId) {
          await onSetLocations(initial.id, value.locationIds, value.locationId);
        }
      } else {
        if (!staffCode.trim()) {
          setError("Укажите код сотрудника (короткий логин).");
          setBusy(false);
          return;
        }
        const pinStr = pin === null ? "" : String(pin);
        if (!pinStr && !email.trim()) {
          setError("Укажите PIN-код или, в разделе «Дополнительно», email и пароль.");
          setBusy(false);
          return;
        }
        if (pinStr && !/^\d{4,6}$/.test(pinStr)) {
          setError("PIN должен состоять из 4–6 цифр.");
          setBusy(false);
          return;
        }
        if (email.trim() && password.length < 8) {
          setError("Пароль должен быть не короче 8 символов.");
          setBusy(false);
          return;
        }
        await onCreate({
          displayName: value.displayName,
          role: value.role,
          locationIds: value.locationIds,
          primaryLocationId: value.locationId,
          staffCode: staffCode.trim(),
          pin: pinStr || undefined,
          email: email.trim() || undefined,
          password: email.trim() ? password : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось сохранить сотрудника");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Редактировать сотрудника" : "Новый сотрудник"}
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
      <FormField label="Имя" htmlFor="staff-name">
        <input
          id="staff-name"
          type="text"
          value={value.displayName}
          onChange={(e) => setValue((v) => ({ ...v, displayName: e.target.value }))}
        />
      </FormField>

      <FormField label="Роль" htmlFor="staff-role">
        <select id="staff-role" value={value.role} onChange={(e) => setValue((v) => ({ ...v, role: e.target.value }))}>
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role] ?? role}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Точки" hint="Сотрудник может работать на одной или обеих точках.">
        <div className="lua-form-checkbox-group">
          {locations.map((loc) => (
            <label key={loc.id} className="lua-form-checkbox">
              <input
                type="checkbox"
                checked={value.locationIds.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
              />
              {loc.shortName}
            </label>
          ))}
        </div>
      </FormField>

      {value.locationIds.length > 1 ? (
        <FormField label="Основная точка" htmlFor="staff-primary-location">
          <select
            id="staff-primary-location"
            value={value.locationId}
            onChange={(e) => setValue((v) => ({ ...v, locationId: e.target.value }))}
          >
            {locations
              .filter((loc) => value.locationIds.includes(loc.id))
              .map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.shortName}
                </option>
              ))}
          </select>
        </FormField>
      ) : null}

      {!initial ? (
        <>
          <FormField label="Код сотрудника" htmlFor="staff-code" hint="Короткий логин, например AIGERIM">
            <input
              id="staff-code"
              type="text"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
              placeholder="AIGERIM"
            />
          </FormField>
          <FormField label="PIN-код" htmlFor="staff-pin" hint="4–6 цифр — сотрудник будет входить кодом и PIN">
            <NumericInput id="staff-pin" value={pin} onChange={setPin} placeholder="4826" />
          </FormField>

          <button
            type="button"
            className="lua-form-advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Скрыть дополнительно" : "Дополнительно: вход по email"}
          </button>
          {showAdvanced ? (
            <div className="lua-form-row">
              <FormField label="Email (необязательно)" htmlFor="staff-email">
                <input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <FormField label="Пароль" htmlFor="staff-password">
                <input
                  id="staff-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                />
              </FormField>
            </div>
          ) : null}
        </>
      ) : null}

      {initial ? (
        <label className="lua-form-checkbox">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))}
          />
          Активен
        </label>
      ) : null}
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
