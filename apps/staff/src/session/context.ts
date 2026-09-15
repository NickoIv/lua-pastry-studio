import { createContext } from "react";
import type { StaffUser } from "@lua/types";

export interface SessionValue {
  staff: StaffUser | null;
  signIn: (staff: StaffUser) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);
