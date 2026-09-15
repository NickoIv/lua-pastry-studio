import { createContext } from "react";
import { createMockBackend, type MockBackend } from "@lua/domain";
import { asId, type CustomerId } from "@lua/types";

export const BackendContext = createContext<MockBackend | null>(null);

let sharedBackend: MockBackend | null = null;
export function getSharedBackend(): MockBackend {
  sharedBackend ??= createMockBackend();
  return sharedBackend;
}

/** Demo-only: Guest has no auth flow yet, so the signed-in guest is fixed to the fixture customer. */
export const CURRENT_CUSTOMER_ID: CustomerId = asId("cust_nikolay");
