import { createContext } from "react";

export interface StaffSessionInfo {
  id: string;
  displayName: string;
  role: string;
  locationId: string;
}

export interface SessionValue {
  staff: StaffSessionInfo | null;
  signIn: (staff: StaffSessionInfo, token?: string) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);
