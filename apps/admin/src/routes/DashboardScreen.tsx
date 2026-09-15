import { Money, Points, Skeleton } from "@lua/ui";
import { formatOrderDateTime } from "@lua/utils";
import { useAdminOrders, useDashboard } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import "./DashboardScreen.css";

interface OrderRow {
  id: string;
  date: string;
  items: string;
  total: { currency: "KZT"; minorUnits: number };
  points: number;
}

export function DashboardScreen() {
  const dashboard = useDashboard();
  const orders = useAdminOrders();

  const rows: OrderRow[] =
    orders.status === "success"
      ? orders.data.map((order) => ({
          id: order.id,
          date: formatOrderDateTime(order.createdAt),
          items: order.items.map((i) => i.productName).join(", "),
          total: order.total,
          points: order.pointsEarned,
        }))
      : [];

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
      {dashboard.status === "loading" ? (
        <div className="lua-dashboard__stats">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={90} />
          ))}
        </div>
      ) : dashboard.status === "success" ? (
        <div className="lua-dashboard__stats">
          <StatCard
            label="Выручка (завершённые заказы)"
            value={<Money value={dashboard.data.revenue} />}
          />
          <StatCard
            label="Завершённых заказов"
            value={String(dashboard.data.ordersCompleted)}
          />
          <StatCard
            label="Участников Lua Club"
            value={String(dashboard.data.activeMembers)}
          />
          <StatCard
            label="Начислено баллов (30 дн.)"
            value={dashboard.data.pointsIssued30d.toLocaleString("ru-RU")}
          />
          <StatCard
            label="Списано баллов (30 дн.)"
            value={dashboard.data.pointsRedeemed30d.toLocaleString("ru-RU")}
          />
        </div>
      ) : (
        <p>Не удалось загрузить дашборд.</p>
      )}

      <section className="lua-dashboard__section">
        <h2 className="lua-dashboard__section-title">Последние заказы</h2>
        {orders.status === "loading" ? (
          <Skeleton height={200} />
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </section>
    </div>
  );
}
