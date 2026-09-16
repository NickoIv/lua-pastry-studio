import { Router } from "express";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireStaff } from "../auth/middleware";
import { rateLimit, sessionKey } from "../rateLimit";

export const redemptionsRouter = Router();

const confirmRateLimit = rateLimit({ name: "reward-confirm", windowMs: 60_000, max: 30, keyFn: sessionKey });

redemptionsRouter.post(
  "/staff/redemptions/:redemptionId/confirm",
  requireStaff,
  confirmRateLimit,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    const result = await withRole("app_staff", { staffId }, async (client) => {
      const queryResult = await client.query<{ confirm_reward_redemption: unknown }>(
        "select confirm_reward_redemption($1, $2) as confirm_reward_redemption",
        [req.params.redemptionId, staffId],
      );
      return queryResult.rows[0]!.confirm_reward_redemption;
    });
    res.json(result);
  }),
);
