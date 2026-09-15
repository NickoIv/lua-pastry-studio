import { useNavigate } from "react-router-dom";
import { Button, ClockIcon, ScanIcon } from "@lua/ui";
import { roleHasPermission, type Role } from "@lua/types";
import { useRequiredStaff } from "../session/useSession";
import "./HomeScreen.css";

function isKnownRole(role: string): role is Role {
  return ["BARISTA", "WAITER", "SHIFT_MANAGER", "ADMIN", "OWNER"].includes(role);
}

export function HomeScreen() {
  const staff = useRequiredStaff();
  const navigate = useNavigate();
  const canViewShiftLog =
    isKnownRole(staff.role) && roleHasPermission(staff.role, "shift.view_log");

  return (
    <div className="lua-staff-home">
      <p className="lua-staff-home__greeting">Смена начата</p>
      <p className="lua-staff-home__location">Точка: Lua Pastry Studio — Достык</p>

      <button className="lua-staff-home__scan" onClick={() => navigate("/scan")}>
        <ScanIcon />
        <span>Сканировать QR</span>
      </button>

      {canViewShiftLog ? (
        <Button
          variant="secondary"
          leadingIcon={<ClockIcon />}
          onClick={() => navigate("/shift-log")}
        >
          Журнал смены
        </Button>
      ) : null}
    </div>
  );
}
