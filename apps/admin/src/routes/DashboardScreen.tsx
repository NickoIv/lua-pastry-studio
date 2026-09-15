import { Money, Points } from "@lua/ui";
import { formatOrderDateTime } from "@lua/utils";
import { sumMoney, type money } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import "./DashboardScreen.css";

interface OrderRow {
  id: string;
  date: string;
  items: string;
  total: ReturnType<typeof money>;
  points: number;
}

export function DashboardScreen() {
  const backend = useBackend();
  const orders = backend.store.orders;
  const transactions = backend.store.loyaltyTransactions;

  const revenue = sumMoney(orders.map((o) => o.total));
  const pointsIssued = transactions
    .filter((t) => t.points > 0)
    .reduce((s, t) => s + t.points, 0);
  const pointsRedeemed = transactions
    .filter((t) => t.points < 0)
    .reduce((s, t) => s - t.points, 0);

  const rows: OrderRow[] = orders
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => ({
      id: order.id,
      date: formatOrderDateTime(order.createdAt),
      items: order.items.map((i) => i.productName).join(", "),
      total: order.total,
      points: order.pointsEarned,
    }));

  const columns: DataTableColumn<OrderRow>[] = [
    { key: "date", header: "Дата", render: (r) => r.date },
    { key: "items", header: "Состав", render: (r) => r.items },
    {
      key: "total",
      header: "Сумма",
      align: "right",
      render: (r) => <Money value={r.total} />,
    },
    {
      key: "points",
      header: "Баллы",
      align: "right",
      render: (r) => <Points value={r.points} signed />,
    },
  ];

  return (
    <div>
      <PageHeader title="Дашборд" />
      <div className="lua-dashboard__stats">
        <StatCard label="Выручка (демо-данные)" value={<Money value={revenue} />} />
        <StatCard label="Заказов" value={String(orders.length)} />
        <StatCard
          label="Участников Lua Club"
          value={String(backend.store.customers.length)}
        />
        <StatCard label="Начислено баллов" value={pointsIssued.toLocaleString("ru-RU")} />
        <StatCard label="Списано баллов" value={pointsRedeemed.toLocaleString("ru-RU")} />
      </div>

      <section className="lua-dashboard__section">
        <h2 className="lua-dashboard__section-title">Последние заказы</h2>
        <DataTable columns={columns} rows={rows} />
      </section>
    </div>
  );
}
