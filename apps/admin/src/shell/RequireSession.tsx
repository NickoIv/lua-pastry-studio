import { Navigate, Outlet } from "react-router-dom";
import { APP_CONFIG } from "@lua/config";
import { useSession } from "../session/useSession";

/** Mock mode has no login flow (see docs/ARCHITECTURE.md "Known limitations") — only server mode enforces a session. */
export function RequireSession() {
  const { staff } = useSession();
  if (APP_CONFIG.dataMode === "server" && !staff) return <Navigate to="/login" replace />;
  return <Outlet />;
}
