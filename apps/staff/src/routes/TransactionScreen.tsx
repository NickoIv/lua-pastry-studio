import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ServerScanSummary } from "@lua/data-server";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { Button, Card, CheckIcon, Points, Skeleton } from "@lua/ui";
import { useConfirmOrderEarn, useConfirmRedemption, useOpenOrders } from "../data/hooks";
import "./TransactionScreen.css";

interface TransactionState {
  summary: ServerScanSummary;
}

export function TransactionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TransactionState | null;
  const openOrders = useOpenOrders();
  const confirmOrderEarn = useConfirmOrderEarn();
  const confirmRedemption = useConfirmRedemption();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resultBalance, setResultBalance] = useState<number | null>(null);
  const [resultPoints, setResultPoints] = useState<number | null>(null);

  if (!state) {
    return (
      <div className="lua-transaction">
        <p>Нет активной операции.</p>
        <Button variant="secondary" onClick={() => navigate("/scan")}>
          К сканированию
        </Button>
      </div>
    );
  }

  const { summary } = state;

  async function confirmEarn() {
    if (!selectedOrderId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmOrderEarn(selectedOrderId, summary.customer.id);
      setResultPoints(result.order.pointsEarned);
      setResultBalance(summary.customer.balance + result.order.pointsEarned);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? API_ERROR_MESSAGES_RU[err.code]
          : "Не удалось подтвердить операцию",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmRedeem() {
    if (!summary.redemption) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmRedemption(summary.redemption.id);
      setResultBalance(result.newBalance);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? API_ERROR_MESSAGES_RU[err.code]
          : "Не удалось подтвердить операцию",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="lua-transaction lua-transaction--success">
        <div className="lua-transaction__success-icon">
          <CheckIcon />
        </div>
        <p className="lua-transaction__success-title">Готово</p>
        {resultPoints !== null ? (
          <p className="lua-transaction__success-detail">
            Начислено <Points value={resultPoints} signed />
          </p>
        ) : null}
        {resultBalance !== null ? (
          <p className="lua-transaction__success-balance">
            Новый баланс: <Points value={resultBalance} />
          </p>
        ) : null}
        <Button onClick={() => navigate("/scan")}>Новое сканирование</Button>
      </div>
    );
  }

  return (
    <div className="lua-transaction">
      <Card className="lua-transaction__customer">
        <p className="lua-transaction__customer-name">{summary.customer.displayName}</p>
        <p className="lua-transaction__customer-meta">
          Lua Club · {summary.customer.maskedPhone}
        </p>
        <p className="lua-transaction__customer-balance">
          Баланс: <Points value={summary.customer.balance} />
        </p>
      </Card>

      {error ? <p className="lua-transaction__error">{error}</p> : null}

      {summary.purpose === "IDENTITY" ? (
        <Card className="lua-transaction__op">
          <p className="lua-transaction__op-title">Выберите заказ</p>
          {openOrders.status === "loading" ? (
            <Skeleton height={80} />
          ) : openOrders.status === "success" && openOrders.data.length > 0 ? (
            <div className="lua-transaction__orders">
              {openOrders.data.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`lua-transaction__order-row${selectedOrderId === order.id ? " lua-transaction__order-row--selected" : ""}`}
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <span className="lua-transaction__order-row-main">
                    <span className="lua-transaction__order-code">
                      {order.externalOrderCode ? `Заказ ${order.externalOrderCode}` : "Заказ"}
                    </span>
                    <span className="lua-transaction__order-items">
                      {order.items.map((i) => i.productName).join(", ")}
                    </span>
                  </span>
                  <span className="lua-transaction__order-total">
                    {(order.total.minorUnits / 100).toLocaleString("ru-RU")} ₸
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="lua-transaction__empty">Нет открытых заказов</p>
          )}
          <Button
            fullWidth
            disabled={busy || !selectedOrderId}
            onClick={() => void confirmEarn()}
          >
            {busy ? "Подтверждение…" : "Подтвердить покупку"}
          </Button>
        </Card>
      ) : summary.redemption ? (
        <Card className="lua-transaction__op">
          <p className="lua-transaction__op-title">Награда за баллы</p>
          <div className="lua-transaction__op-row">
            <span className="lua-transaction__op-label">Награда</span>
            <span className="lua-transaction__op-value">{summary.redemption.rewardTitle.ru}</span>
          </div>
          <div className="lua-transaction__op-row">
            <span className="lua-transaction__op-label">Стоимость</span>
            <Points value={summary.redemption.pointsCost} />
          </div>
          <div className="lua-transaction__op-row lua-transaction__op-total">
            <span className="lua-transaction__op-label">После операции</span>
            <Points value={summary.customer.balance - summary.redemption.pointsCost} />
          </div>
          <Button fullWidth disabled={busy} onClick={() => void confirmRedeem()}>
            {busy ? "Подтверждение…" : "Подтвердить выдачу"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
