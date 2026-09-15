import { createContext } from "react";
import type { CustomerSession } from "@lua/data-server";

export interface SessionValue {
  session: CustomerSession | null;
  signIn: (session: CustomerSession) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);
