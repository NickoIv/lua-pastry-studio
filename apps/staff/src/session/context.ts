import { createContext } from "react";

/**
 * The one staff session shape both modes produce: a mock `StaffUser`
 * (id/displayName/role/locationId) already has exactly these fields, and
 * @lua/data-server's `StaffSession.staff` matches too — so every screen
 * downstream of `useSession()` is mode-agnostic. See
 * docs/ARCHITECTURE.md "Repository adapters".
 */
export interface StaffSessionInfo {
  id: string;
  displayName: string;
  role: string;
  locationId: string;
}

export interface SessionValue {
  staff: StaffSessionInfo | null;
  /** `token` is only set (and only matters) in server mode. */
  signIn: (staff: StaffSessionInfo, token?: string) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);
