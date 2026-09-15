import { Badge, Button, PlusIcon, Skeleton } from "@lua/ui";
import { useAdminStaff, useLocations } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

interface StaffRow {
  id: string;
  displayName: string;
  role: string;
  locationId: string;
  active: boolean;
}

export function StaffScreen() {
  const staffUsers = useAdminStaff();
  const locations = useLocations();

  const locationName = (id: string) =>
    (locations.status === "success" && locations.data.find((l) => l.id === id)?.name) ||
    "—";

  const columns: DataTableColumn<StaffRow>[] = [
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
      {staffUsers.status === "loading" ? (
        <Skeleton height={220} />
      ) : staffUsers.status === "success" ? (
        <DataTable columns={columns} rows={staffUsers.data} />
      ) : (
        <p>Не удалось загрузить сотрудников.</p>
      )}
    </div>
  );
}
