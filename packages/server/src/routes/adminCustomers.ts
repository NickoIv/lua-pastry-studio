import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { writeAuditLog } from "../audit";
import { mapCustomer, mapLoyaltyTransaction, mapOrder, mapRedemption, type CustomerRow, type LoyaltyTransactionRow, type OrderItemRow, type OrderRow, type RedemptionRow } from "../mappers";
import { readIdempotencyKey, readNonEmptyString, readOptionalDateOnly } from "../validation";

export const adminCustomersRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

adminCustomersRouter.get(
  "/admin/customers/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const customerId = req.params.id;

    const [profileRows, balanceRows, transactions, orders, redemptions] = await Promise.all([
      queryAs<CustomerRow>("app_admin", guards, "select * from customer_profiles where id = $1", [customerId]),
      queryAs<{ balance: string }>(
        "app_admin",
        guards,
        "select coalesce(sum(points), 0) as balance from loyalty_transactions where customer_id = $1",
        [customerId],
      ),
      queryAs<LoyaltyTransactionRow>(
        "app_admin",
        guards,
        "select * from loyalty_transactions where customer_id = $1 order by created_at desc limit 200",
        [customerId],
      ),
      queryAs<OrderRow>(
        "app_admin",
        guards,
        "select * from orders where customer_id = $1 order by created_at desc limit 100",
        [customerId],
      ),
      queryAs<RedemptionRow>(
        "app_admin",
        guards,
        "select * from reward_redemptions where customer_id = $1 order by created_at desc limit 100",
        [customerId],
      ),
    ]);

    const profile = profileRows[0];
    if (!profile) throw new AppError("CUSTOMER_NOT_FOUND", 404);

    const orderIds = orders.map((o) => o.id);
    const items =
      orderIds.length === 0
        ? []
        : await queryAs<OrderItemRow>(
            "app_admin",
            guards,
            "select * from order_items where order_id = any($1)",
            [orderIds],
          );
    const itemsByOrder = new Map<string, OrderItemRow[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    res.json({
      profile: mapCustomer(profile),
      pointsBalance: Number(balanceRows[0]?.balance ?? 0),
      ledger: transactions.map(mapLoyaltyTransaction),
      orders: orders.map((o) => mapOrder(o, itemsByOrder.get(o.id) ?? [])),
      redemptions: redemptions.map(mapRedemption),
    });
  }),
);

interface UpdateCustomerBody {
  firstName?: unknown;
  lastName?: unknown;
  birthDate?: unknown;
}

adminCustomersRouter.patch(
  "/admin/customers/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateCustomerBody;
    const firstName = body.firstName !== undefined ? readNonEmptyString(body.firstName, "firstName") : null;
    const lastName = body.lastName !== undefined ? (typeof body.lastName === "string" ? body.lastName.trim() || null : null) : undefined;
    const birthDateTouched = body.birthDate !== undefined;
    const birthDate = birthDateTouched ? readOptionalDateOnly(body.birthDate) : null;
    const actorStaffId = req.session!.sub;

    const row = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const existing = await client.query<CustomerRow>("select * from customer_profiles where id = $1", [
        req.params.id,
      ]);
      if (existing.rowCount === 0) throw new AppError("CUSTOMER_NOT_FOUND", 404);

      const result = await client.query<CustomerRow>(
        `update customer_profiles set
           first_name = coalesce($1, first_name),
           last_name = case when $2 then $3 else last_name end,
           birth_date = case when $4 then $5 else birth_date end
         where id = $6
         returning *`,
        [firstName, lastName !== undefined, lastName ?? null, birthDateTouched, birthDate, req.params.id],
      );
      const updated = result.rows[0]!;

      if (firstName !== null || lastName !== undefined) {
        await writeAuditLog(client, {
          action: "customer.name_updated",
          actorStaffId,
          targetType: "customer",
          targetId: updated.id,
          summary: `Изменено имя клиента на «${`${updated.first_name} ${updated.last_name ?? ""}`.trim()}»`,
        });
      }
      if (birthDateTouched) {
        await writeAuditLog(client, {
          action: "customer.birthday_updated",
          actorStaffId,
          targetType: "customer",
          targetId: updated.id,
          summary: "Изменена дата рождения клиента",
        });
      }
      return updated;
    });

    res.json(mapCustomer(row));
  }),
);

interface AdjustPointsBody {
  points?: unknown;
  reason?: unknown;
  idempotencyKey?: unknown;
}

adminCustomersRouter.post(
  "/admin/customers/:id/adjust-points",
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = req.body as AdjustPointsBody;
    const rawPoints = body.points;
    if (typeof rawPoints !== "number" || !Number.isInteger(rawPoints) || rawPoints === 0) {
      throw new AppError("VALIDATION", 422);
    }
    const reason = readNonEmptyString(body.reason, "reason");
    const idempotencyKey = readIdempotencyKey(body.idempotencyKey, `manual:${req.params.id}`);
    const actorStaffId = req.session!.sub;

    const result = await withRole("app_admin", { staffId: actorStaffId }, async (client) => {
      const queryResult = await client.query<{ admin_adjust_customer_points: Record<string, unknown> }>(
        "select admin_adjust_customer_points($1, $2, $3, $4, $5)",
        [req.params.id, rawPoints, reason, actorStaffId, idempotencyKey],
      );
      return queryResult.rows[0]!.admin_adjust_customer_points;
    });

    res.status(201).json(result);
  }),
);
