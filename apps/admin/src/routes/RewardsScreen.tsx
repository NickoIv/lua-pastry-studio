import { Badge, Button, PlusIcon, Points, Skeleton } from "@lua/ui";
import { useAdminRewards } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

interface RewardRow {
  id: string;
  title: Record<string, string>;
  pointsCost: number;
  perCustomerLimit: number | null;
  perCustomerLimitWindowDays: number | null;
  isActive: boolean;
}

export function RewardsScreen() {
  const rewards = useAdminRewards();

  const columns: DataTableColumn<RewardRow>[] = [
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
      {rewards.status === "loading" ? (
        <Skeleton height={220} />
      ) : rewards.status === "success" ? (
        <DataTable columns={columns} rows={rewards.data} />
      ) : (
        <p>Не удалось загрузить награды.</p>
      )}
    </div>
  );
}
