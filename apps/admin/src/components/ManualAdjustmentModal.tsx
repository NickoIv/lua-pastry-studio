import { useState } from "react";
import { Button, Points } from "@lua/ui";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { useAdjustCustomerPoints } from "../data/hooks";

export interface ManualAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  currentBalance: number;
  onAdjusted: () => void;
}

/**
 * A signed points delta with a mandatory reason — never a direct
 * balance edit. The server inserts one new `manual_adjustment` ledger
 * row (infra/db/migrations/017_manual_loyalty_adjustment.sql); this
 * modal's "before/after" preview is purely cosmetic, the actual
 * resulting balance always comes back from the server response.
 */
export function ManualAdjustmentModal({
  open,
  onClose,
  customerId,
  currentBalance,
  onAdjusted,
}: ManualAdjustmentModalProps) {
  const adjustPoints = useAdjustCustomerPoints();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => `admin-ui:${crypto.randomUUID()}`);

  if (!open) return null;

  const preview = currentBalance + delta;

  async function handleSubmit() {
    if (delta === 0) {
      setError("Укажите ненулевую корректировку.");
      return;
    }
    if (!reason.trim()) {
      setError("Укажите причину корректировки.");
      return;
    }
    if (preview < 0) {
      setError("Итоговый баланс не может быть отрицательным.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adjustPoints(customerId, { points: delta, reason: reason.trim(), idempotencyKey });
      setDelta(0);
      setReason("");
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось выполнить корректировку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Корректировать баллы"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? "Сохранение…" : "Подтвердить"}
          </Button>
        </>
      }
    >
      <FormField label="Корректировка, баллы" htmlFor="adjust-delta" hint="Положительное число — начисление, отрицательное — списание">
        <input
          id="adjust-delta"
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
      </FormField>
      <FormField label="Причина" htmlFor="adjust-reason">
        <textarea
          id="adjust-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: компенсация за ошибку при заказе"
        />
      </FormField>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "var(--lua-space-sm)",
          background: "var(--lua-color-surface-alt)",
          borderRadius: "var(--lua-radius-sm)",
          marginBottom: "var(--lua-space-md)",
        }}
      >
        <span>
          Баланс: <Points value={currentBalance} />
        </span>
        <span>
          После: <Points value={preview} />
        </span>
      </div>
      {error ? (
        <p className="lua-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
