import { AppHeader, Card, EmptyState, Points, ClockIcon } from "@lua/ui";
import { useBackend } from "../backend/useBackend";
import "./ShiftLogScreen.css";

/**
 * Reads the mock store directly instead of going through
 * LoyaltyRepository — a real ShiftLogRepository (scoped by location and
 * time window, server-side) would replace this for production; the
 * repository interfaces in packages/domain only model per-customer
 * ledger reads today. Fine for a foundation-stage demo screen.
 */
export function ShiftLogScreen() {
  const backend = useBackend();
  const entries = [...backend.store.loyaltyTransactions]
    .filter((tx) => tx.performedByStaffId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  return (
    <div className="lua-shift-log">
      <AppHeader title="Журнал смены" />
      {entries.length === 0 ? (
        <EmptyState icon={<ClockIcon />} title="Операций пока нет" />
      ) : (
        <div className="lua-shift-log__list">
          {entries.map((tx) => (
            <Card key={tx.id} padding="sm" className="lua-shift-log__row">
              <div>
                <p className="lua-shift-log__reason">{tx.reason}</p>
                <p className="lua-shift-log__time">
                  {new Date(tx.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
              <Points value={tx.points} signed className="lua-shift-log__points" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
