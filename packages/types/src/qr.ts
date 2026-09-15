import type { Id, ISODateTimeString } from "./common";
import type { CustomerId } from "./customer";
import type { RewardRedemptionId } from "./reward";

export type QRTokenId = Id<"QRToken">;

/**
 * What the token identifies once a staff device resolves it. IDENTITY is
 * the guest's own rotating QR (scenario A — attach an order, earn
 * points). REWARD_REDEMPTION is the one-shot code issued for a specific
 * pending redemption (scenario B). See docs/ARCHITECTURE.md#qr-security.
 */
export type QRTokenPurpose = "IDENTITY" | "REWARD_REDEMPTION";

/**
 * Client-visible shape of a QR token. In production this is issued by a
 * server, signed (e.g. JWT/HMAC), short-lived and single-use for
 * REWARD_REDEMPTION purposes — the frontend only ever holds the opaque
 * `encoded` payload to render as a QR code, never anything it could
 * forge a valid token from. See QRTokenIssuer/QRTokenVerifier below.
 */
export interface QRToken {
  id: QRTokenId;
  purpose: QRTokenPurpose;
  customerId: CustomerId;
  rewardRedemptionId?: RewardRedemptionId;
  /** Opaque string a Staff scanner reads. Never parse this on the client. */
  encoded: string;
  issuedAt: ISODateTimeString;
  expiresAt: ISODateTimeString;
}

export type QRVerificationResult =
  | { ok: true; token: QRToken }
  | { ok: false; reason: "EXPIRED" | "INVALID_SIGNATURE" | "ALREADY_USED" | "NOT_FOUND" };

/**
 * Server-side abstraction (implemented outside the frontend). Defining
 * the interface now means Lua Staff can be built against it today with
 * a mock implementation and swapped to a real signed-token service
 * later without touching UI code.
 */
export interface QRTokenIssuer {
  issueIdentityToken(customerId: CustomerId, ttlSeconds: number): Promise<QRToken>;
  issueRewardRedemptionToken(
    customerId: CustomerId,
    rewardRedemptionId: RewardRedemptionId,
    ttlSeconds: number,
  ): Promise<QRToken>;
}

export interface QRTokenVerifier {
  verify(encoded: string): Promise<QRVerificationResult>;
  /** Marks a token consumed so a repeat scan cannot replay the same operation. */
  markUsed(tokenId: QRTokenId): Promise<void>;
}
