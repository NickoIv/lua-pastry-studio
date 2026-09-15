import { Router } from "express";
import { withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireStaff } from "../auth/middleware";

export const redemptionsRouter = Router();

redemptionsRouter.post(
  "/staff/redemptions/:redemptionId/confirm",
  requireStaff,
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
