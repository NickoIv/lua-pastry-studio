import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../session/useSession";

export function RequireSession() {
  const { staff } = useSession();
  if (!staff) return <Navigate to="/login" replace />;
  return <Outlet />;
}
