import { createContext } from "react";
import { createMockBackend, type MockBackend } from "@lua/domain";

export const BackendContext = createContext<MockBackend | null>(null);

let sharedBackend: MockBackend | null = null;
export function getSharedBackend(): MockBackend {
  sharedBackend ??= createMockBackend();
  return sharedBackend;
}
