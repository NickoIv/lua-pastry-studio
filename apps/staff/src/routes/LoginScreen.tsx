import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@lua/ui";
import { APP_CONFIG } from "@lua/config";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { useBackend } from "../backend/useBackend";
import { apiClient } from "../data/apiClient";
import { useSession } from "../session/useSession";
import "./LoginScreen.css";

const ROLE_LABEL: Record<string, string> = {
  BARISTA: "Бариста",
  WAITER: "Официант",
  SHIFT_MANAGER: "Старший смены",
  ADMIN: "Админ",
  OWNER: "Владелец",
};

function MockRolePicker() {
  const backend = useBackend();
  const { signIn } = useSession();
  const navigate = useNavigate();

  return (
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
  );
}

function ServerLoginForm() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("aigerim@lua.dev");
  const [password, setPassword] = useState("LuaStaff123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, staff } = await apiClient.loginStaff(email, password);
      signIn(staff, token);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? API_ERROR_MESSAGES_RU[err.code]
          : "Что-то пошло не так",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lua-login__form" onSubmit={handleSubmit}>
      <label className="lua-login__field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="lua-login__field">
        <span>Пароль</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="lua-login__error">{error}</p> : null}
      <Button type="submit" fullWidth disabled={busy}>
        {busy ? "Входим…" : "Начать смену"}
      </Button>
    </form>
  );
}

export function LoginScreen() {
  return (
    <div className="lua-login">
      <p className="lua-login__wordmark">LUA</p>
      <h1 className="lua-login__title">Lua Staff</h1>
      <p className="lua-login__subtitle">
        {APP_CONFIG.dataMode === "server"
          ? "Локальный dev-аккаунт — см. docs/LOCAL-BACKEND.md"
          : "Выберите сотрудника, чтобы начать смену"}
      </p>
      {APP_CONFIG.dataMode === "server" ? <ServerLoginForm /> : <MockRolePicker />}
    </div>
  );
}
