import { useContext } from "react";
import { SessionContext, type SessionValue, type StaffSessionInfo } from "./context";

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used within a SessionProvider");
  return session;
}

export function useRequiredStaff(): StaffSessionInfo {
  const { staff } = useSession();
  if (!staff) throw new Error("useRequiredStaff called outside a signed-in session");
  return staff;
}
