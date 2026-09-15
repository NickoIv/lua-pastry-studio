import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@lua/ui";
import { ApiRequestError } from "@lua/data-server";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { apiClient } from "../data/apiClient";
import { useSession } from "../session/useSession";
import "./LoginScreen.css";

export function LoginScreen() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("dana@lua.dev");
  const [password, setPassword] = useState("LuaStaff123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, staff } = await apiClient.loginStaff(email, password);
      if (staff.role !== "ADMIN" && staff.role !== "OWNER") {
        setError("Этот аккаунт не имеет доступа к Lua Admin.");
        return;
      }
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
    <div className="lua-admin-login">
      <div className="lua-admin-login__card">
        <p className="lua-admin-login__wordmark">LUA</p>
        <h1 className="lua-admin-login__title">Lua Admin</h1>
        <p className="lua-admin-login__subtitle">
          Локальный dev-аккаунт — см. docs/LOCAL-BACKEND.md
        </p>

        <form className="lua-admin-login__form" onSubmit={handleSubmit}>
          <label className="lua-admin-login__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="lua-admin-login__field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="lua-admin-login__error">{error}</p> : null}
          <Button type="submit" fullWidth disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
