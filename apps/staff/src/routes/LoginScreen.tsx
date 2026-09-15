import { useNavigate } from "react-router-dom";
import { Card } from "@lua/ui";
import { useBackend } from "../backend/useBackend";
import { useSession } from "../session/useSession";
import "./LoginScreen.css";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

export function LoginScreen() {
  const backend = useBackend();
  const { signIn } = useSession();
  const navigate = useNavigate();

  return (
    <div className="lua-login">
      <p className="lua-login__wordmark">LUA</p>
      <h1 className="lua-login__title">Lua Staff</h1>
      <p className="lua-login__subtitle">Выберите сотрудника, чтобы начать смену</p>

      <div className="lua-login__list">
        {backend.staffUsers.map((staff) => (
          <Card
            key={staff.id}
            interactive
            padding="sm"
            className="lua-login__row"
            onClick={() => {
              signIn(staff);
              navigate("/");
            }}
          >
            <span className="lua-login__avatar">{staff.displayName.charAt(0)}</span>
            <span className="lua-login__row-text">
              <span className="lua-login__row-name">{staff.displayName}</span>
              <span className="lua-login__row-role">
                {ROLE_LABEL[staff.role] ?? staff.role}
              </span>
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
