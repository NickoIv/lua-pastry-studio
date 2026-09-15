import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  asId,
  money,
  type Order,
  type Reward,
  type RewardRedemption,
  type StaffFacingCustomer,
} from "@lua/types";
import { fixtures } from "@lua/domain";
import { Button, Card, CheckIcon, Money, Points, Skeleton } from "@lua/ui";
import { useBackend } from "../backend/useBackend";
import { useSession } from "../session/useSession";
import "./TransactionScreen.css";

interface IdentityState {
  kind: "identity";
  customerId: string;
  tokenId: string;
}
interface RewardState {
  kind: "reward";
  redemptionId: string;
  tokenId: string;
}

const DEMO_ORDER_ITEMS = [
  fixtures.products.find((p) => p.id === "prod_cappuccino")!,
  fixtures.products.find((p) => p.id === "prod_croissant_almond")!,
  fixtures.products.find((p) => p.id === "prod_petit_prince")!,
];

export function TransactionScreen() {
  const backend = useBackend();
  const { staff } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as IdentityState | RewardState | null;

  const [customer, setCustomer] = useState<StaffFacingCustomer | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [redemption, setRedemption] = useState<RewardRedemption | null>(null);
  const [done, setDone] = useState(false);
  const [resultBalance, setResultBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const orderTotal = money(
    DEMO_ORDER_ITEMS.reduce((sum, p) => sum + p.price.minorUnits, 0) / 100,
  );

  useEffect(() => {
    if (!state) return;
    if (state.kind === "identity") {
      void backend.customers.getStaffFacingView(asId(state.customerId)).then(setCustomer);
      void backend.loyalty
        .getAccount(asId(state.customerId))
        .then((a) => setBalance(a.pointsBalance));
    } else {
      void backend.rewards.getRedemption(asId(state.redemptionId)).then(async (r) => {
        setRedemption(r);
        if (r) {
          const [rewardData, customerView, account] = await Promise.all([
            backend.rewards.getReward(r.rewardId),
            backend.customers.getStaffFacingView(r.customerId),
            backend.loyalty.getAccount(r.customerId),
          ]);
          setReward(rewardData);
          setCustomer(customerView);
          setBalance(account.pointsBalance);
        }
      });
    }
  }, [state, backend]);

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

  async function confirmEarn() {
    if (state?.kind !== "identity" || !staff) return;
    setBusy(true);
    try {
      const order: Order = {
        id: asId(`ord_sim_${Date.now()}`),
        customerId: asId(state.customerId),
        locationId: staff.locationId,
        staffUserId: staff.id,
        items: DEMO_ORDER_ITEMS.map((p, i) => ({
          id: asId(`item_sim_${i}`),
          productId: p.id,
          productName: p.name.ru,
          quantity: 1,
          unitPrice: p.price,
          lineTotal: p.price,
        })),
        subtotal: orderTotal,
        discount: money(0),
        total: orderTotal,
        status: "COMPLETED",
        pointsEarned: 0,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      await backend.earnService.earnForCompletedOrder(order, staff.id);
      await backend.qr.markUsed(asId(state.tokenId));
      const account = await backend.loyalty.getAccount(order.customerId!);
      setResultBalance(account.pointsBalance);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRedeem() {
    if (state?.kind !== "reward" || !staff || !redemption) return;
    setBusy(true);
    try {
      const { redemption: fulfilled } = await backend.redemptionService.fulfillRedemption(
        redemption.id,
        staff.id,
      );
      await backend.qr.markUsed(asId(state.tokenId));
      const account = await backend.loyalty.getAccount(fulfilled.customerId);
      setResultBalance(account.pointsBalance);
      setDone(true);
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
      {!customer ? (
        <Skeleton height={140} />
      ) : (
        <Card className="lua-transaction__customer">
          <p className="lua-transaction__customer-name">{customer.displayName}</p>
          <p className="lua-transaction__customer-meta">
            Lua Club · {customer.loyaltyTier}
          </p>
          {balance !== null ? (
            <p className="lua-transaction__customer-balance">
              Баланс: <Points value={balance} />
            </p>
          ) : null}
        </Card>
      )}

      {state.kind === "identity" ? (
        <Card className="lua-transaction__op">
          <p className="lua-transaction__op-title">Текущая операция</p>
          {DEMO_ORDER_ITEMS.map((p) => (
            <div key={p.id} className="lua-transaction__op-row">
              <span>{p.name.ru}</span>
              <Money value={p.price} />
            </div>
          ))}
          <div className="lua-transaction__op-row lua-transaction__op-total">
            <span>Итого</span>
            <Money value={orderTotal} />
          </div>
          <Button fullWidth disabled={busy} onClick={() => void confirmEarn()}>
            {busy ? "Подтверждение…" : "Подтвердить покупку"}
          </Button>
        </Card>
      ) : (
        <Card className="lua-transaction__op">
          <p className="lua-transaction__op-title">Награда за баллы</p>
          {reward ? (
            <div className="lua-transaction__op-row lua-transaction__op-total">
              <span>{reward.title.ru}</span>
              <Points value={reward.pointsCost} />
            </div>
          ) : (
            <Skeleton height={24} />
          )}
          <Button
            fullWidth
            disabled={busy || !reward}
            onClick={() => void confirmRedeem()}
          >
            {busy ? "Подтверждение…" : "Подтвердить выдачу"}
          </Button>
        </Card>
      )}
    </div>
  );
}
