import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer } from "../auth/middleware";
import { sessionRole } from "../auth/sessionRole";
import { mapReward, mapRedemption, type RewardRow, type RedemptionRow } from "../mappers";
import { generateRawToken, digestToken } from "../qr";
import { getQrTokenTtlSeconds } from "../loyaltyProgram";
import { AppError } from "../errors";
import { rateLimit, sessionKey } from "../rateLimit";

export const rewardsRouter = Router();

const redeemRateLimit = rateLimit({ name: "reward-redeem", windowMs: 60_000, max: 20, keyFn: sessionKey });

rewardsRouter.get(
  "/rewards",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<RewardRow>(
      role,
      guards,
      "select * from rewards where is_active order by points_cost",
    );
    res.json(rows.map(mapReward));
  }),
);

rewardsRouter.get(
  "/me/redemptions",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<RedemptionRow>(
      "app_customer",
      { customerId: req.session!.sub },
      "select * from reward_redemptions where customer_id = $1 order by created_at desc",
      [req.session!.sub],
    );
    res.json(rows.map(mapRedemption));
  }),
);

/**
 * Scenario B step 1+2 combined at the HTTP boundary: create the PENDING
 * redemption, then immediately issue the QR session for it (the raw
 * token is generated here and returned once; only its digest is stored
 * — see packages/server/src/qr.ts and docs/QR-SECURITY.md).
 */
rewardsRouter.post(
  "/me/rewards/:rewardId/redeem",
  requireCustomer,
  redeemRateLimit,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const rewardId = req.params.rewardId;
    if (!rewardId) throw new AppError("VALIDATION", 422);

    const ttlSeconds = await getQrTokenTtlSeconds("app_customer", { customerId });

    const redemption = await withRole("app_customer", { customerId }, async (client) => {
      const result = await client.query(
        "select request_reward_redemption($1, $2, $3) as data",
        [customerId, rewardId, ttlSeconds],
      );
      return result.rows[0].data as ReturnType<typeof mapRedemption> & {
        id: string;
        expiresAt: string;
      };
    });

    const rawToken = generateRawToken();
    const digest = digestToken(rawToken);

    await withRole("app_customer", { customerId }, async (client) => {
      await client.query("select create_qr_session($1, $2, $3, $4, $5)", [
        digest,
        "REWARD_REDEMPTION",
        customerId,
        redemption.id,
        ttlSeconds,
      ]);
    });

    res.json({
      redemption,
      qr: {
        token: rawToken,
        purpose: "REWARD_REDEMPTION",
        expiresAt: redemption.expiresAt,
      },
    });
  }),
);
