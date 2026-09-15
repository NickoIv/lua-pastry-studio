import { useMemo, useState, type ReactNode } from "react";
import type { StaffUser } from "@lua/types";
import { SessionContext, type SessionValue } from "./context";

/**
 * Demo-only PIN-less role picker — a real deployment authenticates
 * staff devices (PIN/badge/SSO) against the backend, never trusts a
 * client-chosen StaffUser like this. See docs/ARCHITECTURE.md.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);

  const value = useMemo<SessionValue>(
    () => ({
      staff,
      signIn: setStaff,
      signOut: () => setStaff(null),
    }),
    [staff],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
