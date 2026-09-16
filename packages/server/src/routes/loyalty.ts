import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer, requireRole } from "../auth/middleware";
import { sessionRole } from "../auth/sessionRole";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import {
  mapLoyaltyProgram,
  mapLoyaltyTransaction,
  type LoyaltyProgramRow,
  type LoyaltyTransactionRow,
} from "../mappers";

export const loyaltyRouter = Router();

async function loadAccount(customerId: string) {
  const rows = await queryAs<{ balance: string; lifetime: string }>(
    "app_customer",
    { customerId },
    `select
       coalesce(sum(points), 0) as balance,
       coalesce(sum(points) filter (where points > 0), 0) as lifetime
     from loyalty_transactions where customer_id = $1`,
    [customerId],
  );
  const programRows = await queryAs<LoyaltyProgramRow>(
    "app_customer",
    { customerId },
    "select * from loyalty_programs where id = 'default'",
  );
  const program = programRows[0] ? mapLoyaltyProgram(programRows[0]) : null;
  const balance = Number(rows[0]?.balance ?? 0);
  const lifetime = Number(rows[0]?.lifetime ?? 0);
  const tier =
    program?.tiers
      .filter((t) => lifetime >= t.minLifetimePoints)
      .sort((a, b) => b.minLifetimePoints - a.minLifetimePoints)[0]?.name ?? "Lua";
  return {
    customerId,
    pointsBalance: balance,
    lifetimePointsEarned: lifetime,
    tier,
    updatedAt: new Date().toISOString(),
  };
}

loyaltyRouter.get(
  "/me/loyalty/account",
  requireCustomer,
  asyncHandler(async (req, res) => {
    res.json(await loadAccount(req.session!.sub));
  }),
);

loyaltyRouter.get(
  "/me/loyalty/transactions",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const rows = await queryAs<LoyaltyTransactionRow>(
      "app_customer",
      { customerId: req.session!.sub },
      "select * from loyalty_transactions where customer_id = $1 order by created_at asc",
      [req.session!.sub],
    );
    res.json(rows.map(mapLoyaltyTransaction));
  }),
);

loyaltyRouter.get(
  "/loyalty/program",
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const rows = await queryAs<LoyaltyProgramRow>(
      role,
      guards,
      "select * from loyalty_programs where id = 'default'",
    );
    const row = rows[0];
    if (!row) throw new AppError("INTERNAL", 500);
    res.json(mapLoyaltyProgram(row));
  }),
);

loyaltyRouter.patch(
  "/admin/loyalty/program",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<{
      earnRatePerCurrencyUnit: number;
      birthdayBonusPoints: number;
      pointsExpireAfterDays: number | null;
      isActive: boolean;
      pointsRoundingStrategy: string;
      qrTokenTtlSeconds: number;
    }>;
    const staffId = req.session!.sub;
    const row = await withRole("app_admin", { staffId }, async (client) => {
      const result = await client.query<LoyaltyProgramRow>(
        `update loyalty_programs set
           earn_rate_per_currency_unit = coalesce($1, earn_rate_per_currency_unit),
           birthday_bonus_points = coalesce($2, birthday_bonus_points),
           points_expire_after_days = case when $3::boolean then $4::integer else points_expire_after_days end,
           is_active = coalesce($5, is_active),
           points_rounding_strategy = coalesce($6, points_rounding_strategy),
           qr_token_ttl_seconds = coalesce($7, qr_token_ttl_seconds),
           updated_at = now()
         where id = 'default'
         returning *`,
        [
          body.earnRatePerCurrencyUnit ?? null,
          body.birthdayBonusPoints ?? null,
          "pointsExpireAfterDays" in body,
          body.pointsExpireAfterDays ?? null,
          body.isActive ?? null,
          body.pointsRoundingStrategy ?? null,
          body.qrTokenTtlSeconds ?? null,
        ],
      );
      const updated = result.rows[0];
      if (!updated) throw new AppError("INTERNAL", 500);
      await writeAuditLog(client, {
        action: "settings.loyalty_program.updated",
        actorStaffId: staffId,
        targetType: "loyalty_program",
        targetId: "default",
        summary: "Обновлена конфигурация программы лояльности",
        metadata: {
          earnRatePerCurrencyUnit: updated.earn_rate_per_currency_unit,
          birthdayBonusPoints: updated.birthday_bonus_points,
          qrTokenTtlSeconds: updated.qr_token_ttl_seconds,
        },
      });
      return updated;
    });
    res.json(mapLoyaltyProgram(row));
  }),
);
