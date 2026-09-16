import { Badge, Money, Points, Skeleton, type BadgeTone } from "@lua/ui";
import { formatOrderDateTime } from "@lua/utils";
import { useAdminCustomers, useAdminOrders } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Открыт",
  PAID_UNASSIGNED: "Не привязан",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  REFUNDED: "Возврат",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: "warning",
  PAID_UNASSIGNED: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
};

interface OrderRow {
  id: string;
  createdAt: string;
  customerId?: string;
  items: Array<{ productName: string }>;
  total: { currency: "KZT"; minorUnits: number };
  pointsEarned: number;
  status: string;
}

export function OrdersScreen() {
  const orders = useAdminOrders();
  // pageSize maxes out at 100 server-side — plenty for this demo's
  // customer count; a real deployment would look customers up on
  // demand instead of loading "all" for a lookup map.
  const customers = useAdminCustomers({ pageSize: 100 });

  const customerName = (id?: string) =>
    (customers.status === "success" &&
      customers.data.items.find((c) => c.id === id)?.firstName) ||
    "—";

  const columns: DataTableColumn<OrderRow>[] = [
    { key: "date", header: "Дата", render: (o) => formatOrderDateTime(o.createdAt) },
    { key: "customer", header: "Клиент", render: (o) => customerName(o.customerId) },
    {
      key: "items",
      header: "Состав",
      render: (o) => o.items.map((i) => i.productName).join(", "),
    },
    {
      key: "total",
      header: "Сумма",
      align: "right",
      render: (o) => <Money value={o.total} />,
    },
    {
      key: "points",
      header: "Баллы",
      align: "right",
      render: (o) => <Points value={o.pointsEarned} signed />,
    },
    {
      key: "status",
      header: "Статус",
      render: (o) => (
        <Badge tone={STATUS_TONE[o.status] ?? "neutral"}>
          {STATUS_LABEL[o.status] ?? o.status}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Заказы" />
      {orders.status === "loading" ? (
        <Skeleton height={300} />
      ) : orders.status === "success" ? (
        <DataTable columns={columns} rows={orders.data} />
      ) : (
        <p>Не удалось загрузить заказы.</p>
      )}
    </div>
  );
}
