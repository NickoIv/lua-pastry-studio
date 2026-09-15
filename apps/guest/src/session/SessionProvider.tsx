import { useMemo, useState, type ReactNode } from "react";
import type { CustomerSession } from "@lua/data-server";
import { apiClient } from "../data/apiClient";
import { SessionContext, type SessionValue } from "./context";

const STORAGE_KEY = "lua.guest.session";

function readStoredSession(): CustomerSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

/**
 * Server-mode only: holds the guest's JWT + profile summary. The token
 * is kept in localStorage purely as a per-viewer development
 * convenience (survives a refresh) — a production build would use an
 * httpOnly cookie instead. See docs/ARCHITECTURE.md §11.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(() => {
    const stored = readStoredSession();
    if (stored) apiClient.setToken(stored.token);
    return stored;
  });

  const value = useMemo<SessionValue>(
    () => ({
      session,
      signIn: (next: CustomerSession) => {
        apiClient.setToken(next.token);
        setSession(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Best-effort convenience only.
        }
      },
      signOut: () => {
        apiClient.setToken(null);
        setSession(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Best-effort convenience only.
        }
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
