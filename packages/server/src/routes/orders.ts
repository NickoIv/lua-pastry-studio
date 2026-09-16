import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer, requireStaff } from "../auth/middleware";
import { sessionRole } from "../auth/sessionRole";
import { mapOrder, type OrderItemRow, type OrderRow } from "../mappers";
import { AppError } from "../errors";
import { rateLimit, sessionKey } from "../rateLimit";

export const ordersRouter = Router();

const confirmEarnRateLimit = rateLimit({ name: "earn-confirm", windowMs: 60_000, max: 30, keyFn: sessionKey });

async function loadItems(
  role: Parameters<typeof queryAs>[0],
  guards: Parameters<typeof queryAs>[1],
  orderIds: string[],
) {
  if (orderIds.length === 0) return new Map<string, OrderItemRow[]>();
  const rows = await queryAs<OrderItemRow>(
    role,
    guards,
    "select * from order_items where order_id = any($1)",
    [orderIds],
  );
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const row of rows) {
    const list = byOrder.get(row.order_id) ?? [];
    list.push(row);
    byOrder.set(row.order_id, list);
  }
  return byOrder;
}

ordersRouter.get(
  "/me/orders",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const orders = await queryAs<OrderRow>(
      "app_customer",
      { customerId },
      "select * from orders where customer_id = $1 order by created_at desc",
      [customerId],
    );
    const items = await loadItems(
      "app_customer",
      { customerId },
      orders.map((o) => o.id),
    );
    res.json(orders.map((order) => mapOrder(order, items.get(order.id) ?? [])));
  }),
);

ordersRouter.get(
  "/me/orders/:orderId",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const orders = await queryAs<OrderRow>(
      "app_customer",
      { customerId },
      "select * from orders where id = $1 and customer_id = $2",
      [req.params.orderId, customerId],
    );
    const order = orders[0];
    if (!order) throw new AppError("ORDER_NOT_FOUND", 404);
    const items = await loadItems("app_customer", { customerId }, [order.id]);
    res.json(mapOrder(order, items.get(order.id) ?? []));
  }),
);

/** The "open orders" list Staff picks from after resolving an identity QR. */
ordersRouter.get(
  "/staff/orders/open",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { role, guards } = sessionRole(req.session);
    const orders = await queryAs<OrderRow>(
      role,
      guards,
      "select * from orders where status = 'PAID_UNASSIGNED' order by created_at",
    );
    const items = await loadItems(
      role,
      guards,
      orders.map((o) => o.id),
    );
    res.json(orders.map((order) => mapOrder(order, items.get(order.id) ?? [])));
  }),
);

interface ConfirmEarnBody {
  customerId?: unknown;
}

ordersRouter.post(
  "/staff/orders/:orderId/confirm-earn",
  requireStaff,
  confirmEarnRateLimit,
  asyncHandler(async (req, res) => {
    const body = req.body as ConfirmEarnBody;
    if (typeof body.customerId !== "string" || !body.customerId)
      throw new AppError("VALIDATION", 422);
    const staffId = req.session!.sub;

    const result = await withRole("app_staff", { staffId }, async (client) => {
      const queryResult = await client.query<{ confirm_order_earn: unknown }>(
        "select confirm_order_earn($1, $2, $3) as confirm_order_earn",
        [req.params.orderId, body.customerId, staffId],
      );
      return queryResult.rows[0]!.confirm_order_earn;
    });

    res.json(result);
  }),
);
