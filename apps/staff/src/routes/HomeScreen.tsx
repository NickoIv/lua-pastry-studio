import { useNavigate } from "react-router-dom";
import { Badge, Button, ClockIcon, LocationIcon, ScanIcon } from "@lua/ui";
import { roleHasPermission, type Role } from "@lua/types";
import { useRequiredStaff } from "../session/useSession";
import { useLocations } from "../data/hooks";
import "./HomeScreen.css";

function isKnownRole(role: string): role is Role {
  return ["BARISTA", "WAITER", "SHIFT_MANAGER", "ADMIN", "OWNER"].includes(role);
}

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

export function HomeScreen() {
  const staff = useRequiredStaff();
  const locations = useLocations();
  const navigate = useNavigate();
  const canViewShiftLog =
    isKnownRole(staff.role) && roleHasPermission(staff.role, "shift.view_log");

  const locationName =
    locations.status === "success"
      ? (locations.data.find((l) => l.id === staff.locationId)?.name ?? "Точка не назначена")
      : "…";

  return (
    <div className="lua-staff-home">
      <p className="lua-staff-home__greeting">{staff.displayName}</p>
      <div className="lua-staff-home__identity">
        <Badge tone="accent">{ROLE_LABEL[staff.role] ?? staff.role}</Badge>
        <span className="lua-staff-home__location">
          <LocationIcon aria-hidden="true" />
          {locationName}
        </span>
      </div>

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
