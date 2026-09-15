import { Badge, Points } from "@lua/ui";
import type { CustomerProfile } from "@lua/types";
import { balanceFromLedger } from "@lua/domain";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

export function CustomersScreen() {
  const backend = useBackend();
  const customers = backend.store.customers;

  const balanceFor = (customerId: string) =>
    balanceFromLedger(
      backend.store.loyaltyTransactions.filter((t) => t.customerId === customerId),
    );

  const columns: DataTableColumn<CustomerProfile>[] = [
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
      render: (c) => <Points value={balanceFor(c.id)} />,
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
      <DataTable columns={columns} rows={customers} />
    </div>
  );
}
