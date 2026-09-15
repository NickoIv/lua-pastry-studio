import { useContext } from "react";
import { SessionContext, type SessionValue } from "./context";

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used within a SessionProvider");
  return session;
}
