import { createContext } from "react";
import { createMockBackend, type MockBackend } from "@lua/domain";

export const BackendContext = createContext<MockBackend | null>(null);

/**
 * Staff runs its own in-memory mock backend, separate from Lua Guest's.
 * In dev, that means a QR token issued by the Guest app cannot be
 * verified here — there is no shared server yet. The "simulate scan"
 * buttons on the Scan screen therefore issue AND verify a token against
 * this same instance, which still exercises the full
 * issue → encode → scan → verify → mark-used protocol; only the
 * network hop between two devices is what a real backend adds later.
 * See docs/ARCHITECTURE.md#qr-security.
 */
let sharedBackend: MockBackend | null = null;
export function getSharedBackend(): MockBackend {
  sharedBackend ??= createMockBackend();
  return sharedBackend;
}
