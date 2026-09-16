import { useState } from "react";
import { Button } from "@lua/ui";
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
}

export interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: StaffFormValue | null;
  locations: ServerLocation[];
  onCreate: (input: StaffCreateInput) => Promise<unknown>;
  onUpdate: (id: string, patch: StaffUpdateInput) => Promise<unknown>;
}

function emptyValue(defaultLocationId: string): StaffFormValue {
  return { displayName: "", role: "BARISTA", active: true, locationId: defaultLocationId };
}

export function StaffFormModal({ open, onClose, initial, locations, onCreate, onUpdate }: StaffFormModalProps) {
  const fallback = emptyValue(locations[0]?.id ?? "");
  const [value, setValue] = useState<StaffFormValue>(initial ?? fallback);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (open && (initial?.id !== value.id || (!value.id && !value.locationId && locations.length > 0))) {
    setValue(initial ?? fallback);
    if (!initial) {
      setEmail("");
      setPassword("");
    }
  }

  async function handleSubmit() {
    if (!value.displayName.trim()) {
      setError("Укажите имя сотрудника.");
      return;
    }
    if (!value.locationId) {
      setError("Выберите точку.");
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
          locationId: value.locationId,
        });
      } else {
        if (!email.trim()) {
          setError("Укажите email.");
          setBusy(false);
          return;
        }
        if (password.length < 8) {
          setError("Временный пароль должен быть не короче 8 символов.");
          setBusy(false);
          return;
        }
        await onCreate({
          email: email.trim(),
          password,
          displayName: value.displayName,
          role: value.role,
          locationId: value.locationId,
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
      {!initial ? (
        <>
          <FormField label="Email" htmlFor="staff-email">
            <input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField
            label="Временный пароль"
            htmlFor="staff-password"
            hint="Только для разработки — сотрудник должен сменить его при первом входе, как только появится реальная invitation-система."
          >
            <input
              id="staff-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
            />
          </FormField>
        </>
      ) : null}
      <div className="lua-form-row">
        <FormField label="Роль" htmlFor="staff-role">
          <select
            id="staff-role"
            value={value.role}
            onChange={(e) => setValue((v) => ({ ...v, role: e.target.value }))}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role] ?? role}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Точка" htmlFor="staff-location">
          <select
            id="staff-location"
            value={value.locationId}
            onChange={(e) => setValue((v) => ({ ...v, locationId: e.target.value }))}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>
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
