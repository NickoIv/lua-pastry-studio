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

interface CustomerSummaryRow {
  id: string;
  points_balance: number;
  orders_count: number;
  lifetime_spend_minor_units: number;
  last_order_at: string | null;
}

/**
 * List rows come from one query joining `admin_customer_summary`
 * (016_customer_management.sql) — a single aggregate query, not one
 * balance/order-count lookup per customer. Search is a plain ILIKE
 * across name/phone/email; this seed-scale dataset doesn't need a
 * dedicated text-search index (see docs/ARCHITECTURE.md "Indexes").
 */
adminRouter.get(
  "/admin/customers",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const like = `%${q}%`;

    const whereClause = q
      ? "where cp.first_name ilike $1 or cp.last_name ilike $1 or cp.phone ilike $1 or cp.email ilike $1"
      : "";
    const params = q ? [like] : [];

    const [rows, summaries, totalRows] = await Promise.all([
      queryAs<CustomerRow>(
        "app_admin",
        guards,
        `select cp.* from customer_profiles cp ${whereClause} order by cp.created_at desc limit ${pageSize} offset ${offset}`,
        params,
      ),
      queryAs<CustomerSummaryRow>(
        "app_admin",
        guards,
        `select acs.* from admin_customer_summary acs
         join customer_profiles cp on cp.id = acs.id ${whereClause}
         order by cp.created_at desc limit ${pageSize} offset ${offset}`,
        params,
      ),
      queryAs<{ total: string }>(
        "app_admin",
        guards,
        `select count(*) as total from customer_profiles cp ${whereClause}`,
        params,
      ),
    ]);

    const summaryById = new Map(summaries.map((s) => [s.id, s]));
    res.json({
      items: rows.map((row) => {
        const summary = summaryById.get(row.id);
        return {
          ...mapCustomer(row),
          pointsBalance: summary?.points_balance ?? 0,
          ordersCount: summary?.orders_count ?? 0,
          lifetimeSpend: { currency: "KZT", minorUnits: summary?.lifetime_spend_minor_units ?? 0 },
          lastOrderAt: summary?.last_order_at ?? undefined,
        };
      }),
      total: Number(totalRows[0]?.total ?? 0),
      page,
      pageSize,
    });
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
    const [todayStats] = await queryAs<{ today_count: string }>(
      "app_admin",
      guards,
      // Asia/Almaty, not the server process's own timezone — "today" on
      // a UTC+5 dashboard should mean the same thing to whoever's
      // looking at it, wherever this process happens to run.
      `select count(*) as today_count from orders
       where (created_at at time zone 'Asia/Almaty')::date = (now() at time zone 'Asia/Almaty')::date`,
    );
    const [rewardStats] = await queryAs<{ active_count: string }>(
      "app_admin",
      guards,
      "select count(*) as active_count from rewards where is_active",
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
      ordersToday: Number(todayStats?.today_count ?? 0),
      activeRewards: Number(rewardStats?.active_count ?? 0),
    });
  }),
);
