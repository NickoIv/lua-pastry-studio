import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import {
  mapCustomer,
  mapOrder,
  type CustomerRow,
  type OrderItemRow,
  type OrderRow,
} from "../mappers";

export const adminRouter = Router();

adminRouter.get(
  "/admin/customers",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const rows = await queryAs<CustomerRow>(
      "app_admin",
      guards,
      "select * from customer_profiles order by created_at",
    );
    const balances = await queryAs<{ customer_id: string; balance: string }>(
      "app_admin",
      guards,
      "select customer_id, sum(points) as balance from loyalty_transactions group by customer_id",
    );
    const balanceById = new Map(balances.map((b) => [b.customer_id, Number(b.balance)]));
    res.json(
      rows.map((row) => ({
        ...mapCustomer(row),
        pointsBalance: balanceById.get(row.id) ?? 0,
      })),
    );
  }),
);

adminRouter.get(
  "/admin/orders",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const orders = await queryAs<OrderRow>(
      "app_admin",
      guards,
      "select * from orders order by created_at desc limit 100",
    );
    const ids = orders.map((o) => o.id);
    const items =
      ids.length === 0
        ? []
        : await queryAs<OrderItemRow>(
            "app_admin",
            guards,
            "select * from order_items where order_id = any($1)",
            [ids],
          );
    const itemsByOrder = new Map<string, OrderItemRow[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }
    res.json(orders.map((order) => mapOrder(order, itemsByOrder.get(order.id) ?? [])));
  }),
);

adminRouter.get(
  "/admin/dashboard",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const [orderStats] = await queryAs<{
      order_count: string;
      revenue_minor_units: string;
    }>(
      "app_admin",
      guards,
      "select count(*) as order_count, coalesce(sum(total_minor_units), 0) as revenue_minor_units from orders where status = 'COMPLETED'",
    );
    const [memberStats] = await queryAs<{ member_count: string }>(
      "app_admin",
      guards,
      "select count(*) as member_count from customer_profiles",
    );
    const [pointsStats] = await queryAs<{ issued: string; redeemed: string }>(
      "app_admin",
      guards,
      `select
         coalesce(sum(points) filter (where points > 0), 0) as issued,
         coalesce(sum(-points) filter (where points < 0), 0) as redeemed
       from loyalty_transactions
       where created_at > now() - interval '30 days'`,
    );

    res.json({
      revenue: {
        currency: "KZT",
        minorUnits: Number(orderStats?.revenue_minor_units ?? 0),
      },
      ordersCompleted: Number(orderStats?.order_count ?? 0),
      activeMembers: Number(memberStats?.member_count ?? 0),
      pointsIssued30d: Number(pointsStats?.issued ?? 0),
      pointsRedeemed30d: Number(pointsStats?.redeemed ?? 0),
    });
  }),
);
