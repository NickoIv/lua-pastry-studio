import { useState } from "react";
import { Button, NumericInput, Points } from "@lua/ui";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { useAdjustCustomerPoints } from "../data/hooks";

export interface ManualAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currentBalance: number;
  onAdjusted: () => void;
}

type Direction = "credit" | "debit";

/**
 * A signed points delta with a mandatory reason — never a direct
 * balance edit. The server inserts one new `manual_adjustment` ledger
 * row (infra/db/migrations/017_manual_loyalty_adjustment.sql); this
 * modal's "before/after" preview is purely cosmetic, the actual
 * resulting balance always comes back from the server response.
 *
 * The amount is entered as a plain non-negative magnitude plus a
 * Начислить/Списать toggle rather than one signed field — typing a
 * "-" on a phone's numeric keypad is unreliable, and this also reads
 * the confirmation copy naturally ("Начислить Николаю 100 баллов?").
 * See product brief §7/§8.
 */
export function ManualAdjustmentModal({
  open,
  onClose,
  customerId,
  customerName,
  currentBalance,
  onAdjusted,
}: ManualAdjustmentModalProps) {
  const adjustPoints = useAdjustCustomerPoints();
  const [direction, setDirection] = useState<Direction>("credit");
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [idempotencyKey] = useState(() => `admin-ui:${crypto.randomUUID()}`);

  if (!open) return null;

  const delta = amount === null ? 0 : direction === "credit" ? amount : -amount;
  const preview = currentBalance + delta;

  function reset() {
    setDirection("credit");
    setAmount(null);
    setReason("");
    setError(null);
    setConfirming(false);
  }

  function handleRequestConfirm() {
    if (amount === null || amount <= 0) {
      setError("Укажите количество баллов (больше нуля).");
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
    setError(null);
    setConfirming(true);
  }

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await adjustPoints(customerId, { points: delta, reason: reason.trim(), idempotencyKey });
      reset();
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? API_ERROR_MESSAGES_RU[err.code] : "Не удалось выполнить корректировку");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (confirming) {
    const verb = direction === "credit" ? "Начислить" : "Списать";
    const preposition = direction === "credit" ? "" : "у ";
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Подтвердите корректировку"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Назад
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={busy}>
              {busy ? "Сохранение…" : "Подтвердить"}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: "var(--lua-text-md)", marginBottom: "var(--lua-space-md)" }}>
          {verb} {preposition}
          {customerName} <Points value={amount ?? 0} /> баллов?
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "var(--lua-space-sm)",
            background: "var(--lua-color-surface-alt)",
            borderRadius: "var(--lua-radius-sm)",
          }}
        >
          <span>
            Баланс сейчас: <Points value={currentBalance} />
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Корректировать баллы"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={handleRequestConfirm} disabled={busy}>
            Далее
          </Button>
        </>
      }
    >
      <FormField label="Операция">
        <div className="lua-form-row">
          <Button
            variant={direction === "credit" ? "primary" : "secondary"}
            onClick={() => setDirection("credit")}
            fullWidth
          >
            Начислить
          </Button>
          <Button
            variant={direction === "debit" ? "primary" : "secondary"}
            onClick={() => setDirection("debit")}
            fullWidth
          >
            Списать
          </Button>
        </div>
      </FormField>
      <FormField label="Количество баллов" htmlFor="adjust-amount">
        <NumericInput id="adjust-amount" value={amount} onChange={setAmount} placeholder="100" />
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
          Баланс сейчас: <Points value={currentBalance} />
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
