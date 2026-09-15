import { useMemo, useState, type ReactNode } from "react";
import { apiClient } from "../data/apiClient";
import { SessionContext, type SessionValue, type StaffSessionInfo } from "./context";

const STORAGE_KEY = "lua.staff.session";

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

/**
 * Mock mode: `signIn` is called with a picked StaffUser and no token
 * (see LoginScreen's role picker) — no real authentication, by design,
 * see docs/ARCHITECTURE.md "Known limitations". Server mode: `signIn`
 * is called with the JWT from a real email/password login, kept in
 * localStorage as a per-viewer convenience (not httpOnly-cookie-safe;
 * fine for local dev — see docs/ARCHITECTURE.md §11).
 */
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
