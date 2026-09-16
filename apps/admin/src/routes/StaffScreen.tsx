import { useState } from "react";
import { Badge, Button, PlusIcon, Skeleton } from "@lua/ui";
import { isServerMode, useAdminStaff, useCreateStaff, useLocations, useUpdateStaff } from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { StaffFormModal, type StaffFormValue } from "../components/StaffFormModal";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

interface StaffRow {
  id: string;
  email?: string;
  displayName: string;
  role: string;
  locationId: string;
  active: boolean;
}

export function StaffScreen() {
  const staffUsers = useAdminStaff();
  const locations = useLocations();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const [modal, setModal] = useState<{ open: boolean; value: StaffFormValue | null }>({
    open: false,
    value: null,
  });

  const locationName = (id: string) =>
    (locations.status === "success" && locations.data.find((l) => l.id === id)?.name) ||
    "—";

  const columns: DataTableColumn<StaffRow>[] = [
    { key: "name", header: "Имя", render: (s) => s.displayName },
    { key: "email", header: "Email", render: (s) => s.email ?? "—" },
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
    {
      key: "actions",
      header: "",
      render: (s) =>
        s.role === "OWNER" ? (
          <span style={{ fontSize: "var(--lua-text-xs)", color: "var(--lua-color-text-faint)" }}>
            Защищённая учётная запись
          </span>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="ghost"
              onClick={() =>
                setModal({
                  open: true,
                  value: { id: s.id, displayName: s.displayName, role: s.role, active: s.active, locationId: s.locationId },
                })
              }
            >
              Изменить
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await updateStaff(s.id, { active: !s.active });
                staffUsers.refresh();
              }}
            >
              {s.active ? "Деактивировать" : "Активировать"}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        action={
          <Button leadingIcon={<PlusIcon />} disabled={!isServerMode} onClick={() => setModal({ open: true, value: null })}>
            Добавить сотрудника
          </Button>
        }
      />
      {!isServerMode ? (
        <p style={{ color: "var(--lua-color-text-muted)", marginBottom: 16 }}>
          Управление сотрудниками доступно только в режиме реального бэкенда (VITE_LUA_DATA_MODE=server).
        </p>
      ) : null}
      {staffUsers.status === "loading" ? (
        <Skeleton height={220} />
      ) : staffUsers.status === "success" ? (
        <DataTable columns={columns} rows={staffUsers.data} />
      ) : (
        <p>Не удалось загрузить сотрудников.</p>
      )}

      <StaffFormModal
        open={modal.open}
        onClose={() => setModal({ open: false, value: null })}
        initial={modal.value}
        locations={locations.status === "success" ? locations.data : []}
        onCreate={async (input) => {
          await createStaff(input);
          staffUsers.refresh();
        }}
        onUpdate={async (id, patch) => {
          await updateStaff(id, patch);
          staffUsers.refresh();
        }}
      />
    </div>
  );
}
