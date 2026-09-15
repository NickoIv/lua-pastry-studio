import { Outlet, useNavigate } from "react-router-dom";
import { Badge, IconButton, LogOutIcon } from "@lua/ui";
import { useSession } from "../session/useSession";
import "./StaffShell.css";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

export function StaffShell() {
  const { staff, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div className="lua-staff-shell">
      <header className="lua-staff-shell__header">
        <div className="lua-staff-shell__identity">
          <p className="lua-staff-shell__name">{staff?.displayName}</p>
          {staff ? (
            <Badge tone="accent">{ROLE_LABEL[staff.role] ?? staff.role}</Badge>
          ) : null}
        </div>
        <IconButton
          icon={<LogOutIcon />}
          label="Завершить смену"
          onClick={() => {
            signOut();
            navigate("/login");
          }}
        />
      </header>
      <main className="lua-staff-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
