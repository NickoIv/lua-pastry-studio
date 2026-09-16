import { useState } from "react";
import { Badge, Button, PlusIcon, Points, Skeleton } from "@lua/ui";
import { isServerMode, useAdminRewards, useCreateReward, useUpdateReward } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { RewardFormModal, type RewardFormValue } from "../components/RewardFormModal";

interface RewardRow {
  id: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  pointsCost: number;
  perCustomerLimit: number | null;
  perCustomerLimitWindowDays: number | null;
  isActive: boolean;
  stock: number | null;
}

export function RewardsScreen() {
  const rewards = useAdminRewards();
  const createReward = useCreateReward();
  const updateReward = useUpdateReward();
  const [modal, setModal] = useState<{ open: boolean; value: RewardFormValue | null }>({
    open: false,
    value: null,
  });

  const columns: DataTableColumn<RewardRow>[] = [
    { key: "title", header: "Награда", render: (r) => r.title.ru },
    { key: "cost", header: "Стоимость", align: "right", render: (r) => <Points value={r.pointsCost} /> },
    {
      key: "limit",
      header: "Лимит на клиента",
      render: (r) =>
        r.perCustomerLimit ? `${r.perCustomerLimit} / ${r.perCustomerLimitWindowDays} дн.` : "Без ограничений",
    },
    {
      key: "status",
      header: "Статус",
      render: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Активна" : "Выключена"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="ghost"
            onClick={() =>
              setModal({
                open: true,
                value: {
                  id: r.id,
                  titleRu: r.title.ru ?? "",
                  titleKk: r.title.kk ?? "",
                  titleEn: r.title.en ?? "",
                  descriptionRu: r.description?.ru ?? "",
                  pointsCost: r.pointsCost,
                  active: r.isActive,
                  perCustomerLimit: r.perCustomerLimit,
                  perCustomerLimitWindowDays: r.perCustomerLimitWindowDays,
                  stock: r.stock,
                },
              })
            }
          >
            Изменить
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await updateReward(r.id, { active: !r.isActive });
              rewards.refresh();
            }}
          >
            {r.isActive ? "Выключить" : "Включить"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Награды"
        action={
          <Button leadingIcon={<PlusIcon />} disabled={!isServerMode} onClick={() => setModal({ open: true, value: null })}>
            Добавить награду
          </Button>
        }
      />
      {!isServerMode ? (
        <p style={{ color: "var(--lua-color-text-muted)", marginBottom: 16 }}>
          Редактирование наград доступно только в режиме реального бэкенда (VITE_LUA_DATA_MODE=server).
        </p>
      ) : null}
      {rewards.status === "loading" ? (
        <Skeleton height={220} />
      ) : rewards.status === "success" ? (
        <DataTable columns={columns} rows={rewards.data} />
      ) : (
        <p>Не удалось загрузить награды.</p>
      )}

      <RewardFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, value: null })}
        initial={modal.value}
        onSubmit={async (input) => {
          if (modal.value?.id) {
            await updateReward(modal.value.id, input);
          } else {
            await createReward(input);
          }
          rewards.refresh();
        }}
      />
    </div>
  );
}
