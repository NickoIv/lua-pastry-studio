import { useState, type ReactNode } from "react";
import { BackendContext, getSharedBackend } from "./context";

export function BackendProvider({ children }: { children: ReactNode }) {
  const [backend] = useState(getSharedBackend);
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}
