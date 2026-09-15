import { useContext } from "react";
import { SessionContext, type SessionValue, type StaffSessionInfo } from "./context";

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used within a SessionProvider");
  return session;
}

/** For hooks/screens that only run behind <RequireSession> — `staff` is guaranteed non-null there. */
export function useRequiredStaff(): StaffSessionInfo {
  const { staff } = useSession();
  if (!staff)
    throw new Error("useRequiredStaff called outside a signed-in staff session");
  return staff;
}
