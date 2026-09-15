import { AppHeader, Card, EmptyState, Points, ClockIcon, Skeleton } from "@lua/ui";
import { useShiftLog } from "../data/hooks";
import "./ShiftLogScreen.css";

export function ShiftLogScreen() {
  const shiftLog = useShiftLog();

  return (
    <div className="lua-shift-log">
      <AppHeader title="Журнал смены" />
      {shiftLog.status === "loading" ? (
        <div className="lua-shift-log__list">
          <Skeleton height={60} />
          <Skeleton height={60} />
        </div>
      ) : shiftLog.status === "success" && shiftLog.data.length === 0 ? (
        <EmptyState icon={<ClockIcon />} title="Операций пока нет" />
      ) : shiftLog.status === "success" ? (
        <div className="lua-shift-log__list">
          {shiftLog.data.map((tx) => (
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
      ) : null}
    </div>
  );
}
