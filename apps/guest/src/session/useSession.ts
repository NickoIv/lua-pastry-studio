import { useContext } from "react";
import { SessionContext, type SessionValue } from "./context";

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within a SessionProvider");
  return value;
}
