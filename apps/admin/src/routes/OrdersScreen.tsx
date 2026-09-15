import { Badge, Money, Points } from "@lua/ui";
import type { BadgeTone } from "@lua/ui";
import type { Order, OrderStatus } from "@lua/types";
import { formatOrderDateTime } from "@lua/utils";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

const STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: "Открыт",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  REFUNDED: "Возврат",
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  OPEN: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
  REFUNDED: "danger",
};

export function OrdersScreen() {
  const backend = useBackend();
  const orders = [...backend.store.orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const customerName = (id?: string) =>
    backend.store.customers.find((c) => c.id === id)?.firstName ?? "—";

  const columns: DataTableColumn<Order>[] = [
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
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Заказы" />
      <DataTable columns={columns} rows={orders} />
    </div>
  );
}
