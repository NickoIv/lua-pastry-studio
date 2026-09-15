import { useMemo, useState, type ReactNode } from "react";
import { apiClient } from "../data/apiClient";
import { SessionContext, type SessionValue, type StaffSessionInfo } from "./context";

const STORAGE_KEY = "lua.admin.session";

interface StoredSession {
  staff: StaffSessionInfo;
  token?: string;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/** Mock mode: signed in as the fixture ADMIN (Дана) with no real auth. Server mode: real email/password login — see docs/ARCHITECTURE.md. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffState] = useState<StaffSessionInfo | null>(() => {
    const stored = readStoredSession();
    if (stored?.token) apiClient.setToken(stored.token);
    return stored?.staff ?? null;
  });

  const value = useMemo<SessionValue>(
    () => ({
      staff,
      signIn: (next, token) => {
        if (token) apiClient.setToken(token);
        setStaffState(next);
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ staff: next, token }),
          );
        } catch {
          // Best-effort convenience only.
        }
      },
      signOut: () => {
        apiClient.setToken(null);
        setStaffState(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Best-effort convenience only.
        }
      },
    }),
    [staff],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
