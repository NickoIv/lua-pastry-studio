import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ServerScanSummary } from "@lua/data-server";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU, type LoyaltyProgram } from "@lua/types";
import { calculatePointsEarned } from "@lua/domain";
import { Button, Card, CheckIcon, Points, Skeleton } from "@lua/ui";
import { useConfirmOrderEarn, useConfirmRedemption, useLoyaltyProgram, useOpenOrders } from "../data/hooks";
import "./TransactionScreen.css";

interface TransactionState {
  summary: ServerScanSummary;
}

/**
 * The wrapper exists only to force a full remount per scan — React
 * Router reuses the same TransactionScreen instance across repeated
 * navigations to "/transaction", so without this every piece of local
 * state (selected order, done/result, error) survived from the
 * previous scan into the next one. That was the exact HIGH PRIORITY
 * bug the owner hit manually (product brief §25): scan identity, back
 * out, scan a reward QR, and the old order/balance was still showing.
 * `location.key` is a fresh string on every navigation, including
 * pushes to the same path, so keying on it guarantees "every scan
 * begins with clean transaction state" without hand-tracking which
 * fields to reset.
 */
export function TransactionScreen() {
  const location = useLocation();
  return <TransactionScreenContent key={location.key} />;
}

function TransactionScreenContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TransactionState | null;
  const openOrders = useOpenOrders();
  const loyaltyProgram = useLoyaltyProgram();
  const confirmOrderEarn = useConfirmOrderEarn();
  const confirmRedemption = useConfirmRedemption();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [resultBalance, setResultBalance] = useState<number | null>(null);
  const [resultPoints, setResultPoints] = useState<number | null>(null);

  // Exactly one eligible order → select it automatically (product
  // brief §27) instead of forcing the barista to tap it first.
  useEffect(() => {
    if (openOrders.status === "success" && openOrders.data.length === 1 && !selectedOrderId) {
      // openOrders resolves asynchronously (a real fetch, in server
      // mode), so this is the standard "derive selection once data
      // arrives" effect, not a synchronous same-render cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOrderId(openOrders.data[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOrders.status]);

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
  const selectedOrder =
    openOrders.status === "success" ? openOrders.data.find((o) => o.id === selectedOrderId) : undefined;
  // A preview only — reuses the exact same formula the server's
  // confirm_order_earn applies (packages/domain's calculatePointsEarned,
  // no tier multiplier, matching infra/db/migrations/005_functions.sql),
  // but the actual awarded amount always comes back from the server's
  // own response after confirming. See product brief §27.
  const earnPreview =
    selectedOrder && loyaltyProgram.status === "success"
      ? calculatePointsEarned(selectedOrder.total, loyaltyProgram.data as LoyaltyProgram)
      : null;

  function handleApiError(err: unknown) {
    if (err instanceof ApiRequestError) {
      setError(API_ERROR_MESSAGES_RU[err.code]);
      if (err.code === "QR_EXPIRED" || err.code === "REDEMPTION_ALREADY_COMPLETED" || err.code === "ORDER_ALREADY_REWARDED") {
        setExpired(true);
      }
    } else {
      setError("Не удалось подтвердить операцию");
    }
  }

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
      handleApiError(err);
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
      handleApiError(err);
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
        <p className="lua-transaction__customer-meta">Lua Club</p>
        <p className="lua-transaction__customer-balance">
          Баланс: <Points value={summary.customer.balance} />
        </p>
      </Card>

      {error ? (
        <div className="lua-transaction__error">
          <p style={{ margin: 0 }}>{error}</p>
          {expired ? (
            <Button variant="secondary" fullWidth onClick={() => navigate("/scan")} style={{ marginTop: 8 }}>
              Сканировать новый код
            </Button>
          ) : null}
        </div>
      ) : null}

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

          {selectedOrder ? (
            <div className="lua-transaction__preview">
              <div className="lua-transaction__op-row">
                <span className="lua-transaction__op-label">Заказ</span>
                <span className="lua-transaction__op-value">
                  {selectedOrder.externalOrderCode ?? "—"}
                </span>
              </div>
              <div className="lua-transaction__op-row">
                <span className="lua-transaction__op-label">Итого</span>
                <span className="lua-transaction__op-value">
                  {(selectedOrder.total.minorUnits / 100).toLocaleString("ru-RU")} ₸
                </span>
              </div>
              {earnPreview !== null ? (
                <div className="lua-transaction__op-row">
                  <span className="lua-transaction__op-label">Начислится</span>
                  <Points value={earnPreview} signed />
                </div>
              ) : null}
              <div className="lua-transaction__op-row lua-transaction__op-total">
                <span className="lua-transaction__op-label">Баланс после</span>
                <Points value={summary.customer.balance + (earnPreview ?? 0)} />
              </div>
            </div>
          ) : null}

          <div className="lua-transaction__actions">
            <Button
              fullWidth
              disabled={busy || !selectedOrderId}
              onClick={() => void confirmEarn()}
            >
              {busy ? "Подтверждение…" : "Подтвердить покупку"}
            </Button>
            <div className="lua-transaction__secondary-actions">
              <Button variant="secondary" fullWidth onClick={() => navigate("/scan")}>
                Отмена
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate("/scan")}>
                Сканировать другой QR
              </Button>
            </div>
          </div>
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
          <div className="lua-transaction__actions">
            <Button fullWidth disabled={busy} onClick={() => void confirmRedeem()}>
              {busy ? "Подтверждение…" : "Подтвердить выдачу"}
            </Button>
            <div className="lua-transaction__secondary-actions">
              <Button variant="secondary" fullWidth onClick={() => navigate("/scan")}>
                Отмена
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate("/scan")}>
                Сканировать другой QR
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
