import { Badge, Button, PlusIcon } from "@lua/ui";
import type { StaffUser } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

export function StaffScreen() {
  const backend = useBackend();
  const staffUsers = backend.store.staffUsers;
  const locationName = (id: string) =>
    backend.store.locations.find((l) => l.id === id)?.name ?? "—";

  const columns: DataTableColumn<StaffUser>[] = [
    { key: "name", header: "Имя", render: (s) => s.displayName },
    {
      key: "role",
      header: "Роль",
      render: (s) => <Badge tone="accent">{ROLE_LABEL[s.role] ?? s.role}</Badge>,
    },
    { key: "location", header: "Точка", render: (s) => locationName(s.locationId) },
    {
      key: "status",
      header: "Статус",
      render: (s) => (
        <Badge tone={s.active ? "success" : "neutral"}>
          {s.active ? "Активен" : "Неактивен"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        action={
          <Button leadingIcon={<PlusIcon />} disabled>
            Добавить сотрудника
          </Button>
        }
      />
      <DataTable columns={columns} rows={staffUsers} />
    </div>
  );
}
