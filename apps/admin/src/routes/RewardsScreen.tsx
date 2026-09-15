import { Badge, Button, PlusIcon, Points } from "@lua/ui";
import type { Reward } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

export function RewardsScreen() {
  const backend = useBackend();
  const rewards = backend.store.rewards;

  const columns: DataTableColumn<Reward>[] = [
    { key: "title", header: "Награда", render: (r) => r.title.ru },
    {
      key: "cost",
      header: "Стоимость",
      align: "right",
      render: (r) => <Points value={r.pointsCost} />,
    },
    {
      key: "limit",
      header: "Лимит на клиента",
      render: (r) =>
        r.perCustomerLimit
          ? `${r.perCustomerLimit} / ${r.perCustomerLimitWindowDays} дн.`
          : "Без ограничений",
    },
    {
      key: "status",
      header: "Статус",
      render: (r) => (
        <Badge tone={r.isActive ? "success" : "neutral"}>
          {r.isActive ? "Активна" : "Выключена"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Награды"
        action={
          <Button leadingIcon={<PlusIcon />} disabled>
            Добавить награду
          </Button>
        }
      />
      <DataTable columns={columns} rows={rewards} />
    </div>
  );
}
