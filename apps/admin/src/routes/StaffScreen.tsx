import { useState } from "react";
import { Badge, Button, NumericInput, PlusIcon, Skeleton } from "@lua/ui";
import {
  isServerMode,
  useAdminStaff,
  useCreateStaff,
  useLocations,
  useResetStaffPin,
  useSetStaffLocations,
  useUpdateStaff,
} from "../data/hooks";
import { PageHeader } from "../components/PageHeader";
import { DataTable, type DataTableColumn } from "../components/DataTable";
import { StaffFormModal, type StaffFormValue } from "../components/StaffFormModal";
import { TableRowActions } from "../components/RowActionsMenu";
import { Modal } from "../components/Modal";
import { FormField } from "../components/FormField";

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
  locationIds: string[];
  staffCode: string;
  active: boolean;
}

export function StaffScreen() {
  const staffUsers = useAdminStaff();
  const locations = useLocations();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const setStaffLocations = useSetStaffLocations();
  const resetStaffPin = useResetStaffPin();
  const [modal, setModal] = useState<{ open: boolean; value: StaffFormValue | null }>({
    open: false,
    value: null,
  });
  const [pinResetId, setPinResetId] = useState<string | null>(null);
  const [pinResetValue, setPinResetValue] = useState<number | null>(null);
  const [pinResetError, setPinResetError] = useState<string | null>(null);
  const [pinResetBusy, setPinResetBusy] = useState(false);

  const shortLocationNames = (ids: string[]) => {
    if (locations.status !== "success") return "—";
    const names = ids.map((id) => locations.data.find((l) => l.id === id)?.shortName ?? "—");
    return names.join(", ") || "—";
  };

  async function handlePinReset() {
    if (!pinResetId || pinResetValue === null) {
      setPinResetError("Укажите новый PIN.");
      return;
    }
    const pinStr = String(pinResetValue);
    if (!/^\d{4,6}$/.test(pinStr)) {
      setPinResetError("PIN должен состоять из 4–6 цифр.");
      return;
    }
    setPinResetBusy(true);
    setPinResetError(null);
    try {
      await resetStaffPin(pinResetId, pinStr);
      setPinResetId(null);
      setPinResetValue(null);
    } catch {
      setPinResetError("Не удалось сбросить PIN.");
    } finally {
      setPinResetBusy(false);
    }
  }

  const columns: DataTableColumn<StaffRow>[] = [
    { key: "name", header: "Имя", render: (s) => s.displayName },
    { key: "code", header: "Код", render: (s) => s.staffCode },
    {
      key: "role",
      header: "Роль",
      render: (s) => <Badge tone="accent">{ROLE_LABEL[s.role] ?? s.role}</Badge>,
    },
    { key: "location", header: "Точки", render: (s) => shortLocationNames(s.locationIds) },
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
          <TableRowActions
            actions={[
              {
                key: "edit",
                label: "Изменить",
                onClick: () =>
                  setModal({
                    open: true,
                    value: {
                      id: s.id,
                      displayName: s.displayName,
                      role: s.role,
                      active: s.active,
                      locationId: s.locationId,
                      locationIds: s.locationIds,
                    },
                  }),
              },
              {
                key: "reset-pin",
                label: "Сбросить PIN",
                onClick: () => {
                  setPinResetId(s.id);
                  setPinResetValue(null);
                  setPinResetError(null);
                },
              },
              {
                key: "toggle-active",
                label: s.active ? "Деактивировать" : "Активировать",
                tone: s.active ? "danger" : "default",
                onClick: async () => {
                  await updateStaff(s.id, { active: !s.active });
                  staffUsers.refresh();
                },
              },
            ]}
          />
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
        onSetLocations={async (id, locationIds, primaryLocationId) => {
          await setStaffLocations(id, locationIds, primaryLocationId);
          staffUsers.refresh();
        }}
      />

      <Modal
        open={pinResetId !== null}
        onClose={() => setPinResetId(null)}
        title="Сбросить PIN-код"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPinResetId(null)} disabled={pinResetBusy}>
              Отмена
            </Button>
            <Button onClick={() => void handlePinReset()} disabled={pinResetBusy}>
              {pinResetBusy ? "Сохранение…" : "Сбросить"}
            </Button>
          </>
        }
      >
        <FormField label="Новый PIN" htmlFor="reset-pin-input" hint="4–6 цифр">
          <NumericInput id="reset-pin-input" value={pinResetValue} onChange={setPinResetValue} placeholder="4826" />
        </FormField>
        {pinResetError ? (
          <p className="lua-form-field__error" role="alert">
            {pinResetError}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
