import { useNavigate } from "react-router-dom";
import { Button, ClockIcon, ScanIcon } from "@lua/ui";
import { roleHasPermission } from "@lua/types";
import { useSession } from "../session/useSession";
import "./HomeScreen.css";

export function HomeScreen() {
  const { staff } = useSession();
  const navigate = useNavigate();
  const canViewShiftLog = staff ? roleHasPermission(staff.role, "shift.view_log") : false;

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
