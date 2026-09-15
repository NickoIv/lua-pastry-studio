import { useContext } from "react";
import type { MockBackend } from "@lua/domain";
import { BackendContext } from "./context";

export function useBackend(): MockBackend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error("useBackend must be used within a BackendProvider");
  return backend;
}

export { CURRENT_CUSTOMER_ID } from "./context";
