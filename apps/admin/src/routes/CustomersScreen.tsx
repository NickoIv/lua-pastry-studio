import { Badge, Points, Skeleton } from "@lua/ui";
import { useAdminCustomers } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  pointsBalance: number;
  marketingOptIn: boolean;
  createdAt: string;
}

export function CustomersScreen() {
  const customers = useAdminCustomers();

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Имя",
      render: (c) => `${c.firstName} ${c.lastName ?? ""}`.trim(),
    },
    { key: "phone", header: "Телефон", render: (c) => c.phone },
    {
      key: "balance",
      header: "Баланс",
      align: "right",
      render: (c) => <Points value={c.pointsBalance} />,
    },
    {
      key: "marketing",
      header: "Рассылка",
      render: (c) => (
        <Badge tone={c.marketingOptIn ? "success" : "neutral"}>
          {c.marketingOptIn ? "Да" : "Нет"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "В клубе с",
      render: (c) => new Date(c.createdAt).toLocaleDateString("ru-RU"),
    },
  ];

  return (
    <div>
      <PageHeader title="Клиенты" />
      {customers.status === "loading" ? (
        <Skeleton height={260} />
      ) : customers.status === "success" ? (
        <DataTable
          columns={columns}
          rows={customers.data.map((c) => ({
            ...c,
            pointsBalance: c.pointsBalance ?? 0,
          }))}
        />
      ) : (
        <p>Не удалось загрузить клиентов.</p>
      )}
    </div>
  );
}
