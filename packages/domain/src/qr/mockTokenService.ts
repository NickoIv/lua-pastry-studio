import type {
  CustomerId,
  QRToken,
  QRTokenId,
  QRTokenIssuer,
  QRTokenPurpose,
  QRTokenVerifier,
  QRVerificationResult,
  RewardRedemptionId,
} from "@lua/types";
import { asId } from "@lua/types";

/**
 * DEVELOPMENT-ONLY implementation of QRTokenIssuer/QRTokenVerifier.
 *
 * This is intentionally NOT cryptographically signed and NOT
 * production-safe: tokens are random strings held in an in-memory map,
 * which only works because issuer and verifier run in the same
 * process. A production implementation must live on the server and
 * issue signed, short-lived tokens (e.g. JWT/HMAC) it can verify
 * without trusting the client — see docs/ARCHITECTURE.md#qr-security.
 *
 * The app layer must never import this by a generic name; the
 * `Mock`-prefixed export makes it obvious at every call site.
 */
export class MockQRTokenService implements QRTokenIssuer, QRTokenVerifier {
  private readonly tokensById = new Map<QRTokenId, QRToken>();
  private readonly usedTokenIds = new Set<QRTokenId>();
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async issueIdentityToken(customerId: CustomerId, ttlSeconds: number): Promise<QRToken> {
    return this.issue("IDENTITY", customerId, ttlSeconds);
  }

  async issueRewardRedemptionToken(
    customerId: CustomerId,
    rewardRedemptionId: RewardRedemptionId,
    ttlSeconds: number,
  ): Promise<QRToken> {
    return this.issue("REWARD_REDEMPTION", customerId, ttlSeconds, rewardRedemptionId);
  }

  async verify(encoded: string): Promise<QRVerificationResult> {
    const token = [...this.tokensById.values()].find((t) => t.encoded === encoded);
    if (!token) return { ok: false, reason: "NOT_FOUND" };
    if (this.usedTokenIds.has(token.id)) return { ok: false, reason: "ALREADY_USED" };
    if (new Date(token.expiresAt).getTime() < this.now().getTime()) {
      return { ok: false, reason: "EXPIRED" };
    }
    return { ok: true, token };
  }

  async markUsed(tokenId: QRTokenId): Promise<void> {
    this.usedTokenIds.add(tokenId);
  }

  private issue(
    purpose: QRTokenPurpose,
    customerId: CustomerId,
    ttlSeconds: number,
    rewardRedemptionId?: RewardRedemptionId,
  ): QRToken {
    const id = asId<"QRToken">(`qr_${crypto.randomUUID()}`);
    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);
    const token: QRToken = {
      id,
      purpose,
      customerId,
      rewardRedemptionId,
      encoded: `MOCKQR.${id}.${Math.random().toString(36).slice(2)}`,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    this.tokensById.set(id, token);
    return token;
  }
}
