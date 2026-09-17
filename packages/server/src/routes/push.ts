import { Router } from "express";
import { queryAs, withRole } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireCustomer } from "../auth/middleware";
import { AppError } from "../errors";
import { env } from "../env";
import { readBoolean } from "../validation";

export const pushRouter = Router();

/**
 * Public: the client needs this before it can even call
 * pushManager.subscribe() (it's the `applicationServerKey`). Not
 * secret by design — VAPID public keys are meant to be handed to
 * browsers. See docs/ARCHITECTURE.md "Push notifications".
 */
pushRouter.get(
  "/push/public-key",
  asyncHandler(async (_req, res) => {
    res.json({ publicKey: env.vapidPublicKey || null });
  }),
);

interface SubscribeBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

pushRouter.post(
  "/me/push-subscriptions",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const body = req.body as SubscribeBody;
    if (
      typeof body.endpoint !== "string" ||
      !body.endpoint ||
      typeof body.keys?.p256dh !== "string" ||
      typeof body.keys?.auth !== "string"
    ) {
      throw new AppError("VALIDATION", 422);
    }
    const customerId = req.session!.sub;
    const userAgent = req.header("user-agent") ?? null;

    await withRole("app_customer", { customerId }, async (client) => {
      await client.query(
        `insert into push_subscriptions (customer_id, endpoint, p256dh, auth, user_agent)
         values ($1, $2, $3, $4, $5)
         on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`,
        [customerId, body.endpoint, body.keys!.p256dh, body.keys!.auth, userAgent],
      );
      await client.query(
        `insert into notification_preferences (customer_id) values ($1) on conflict (customer_id) do nothing`,
        [customerId],
      );
    });

    res.status(201).json({ ok: true });
  }),
);

pushRouter.delete(
  "/me/push-subscriptions",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const endpoint = typeof req.query.endpoint === "string" ? req.query.endpoint : null;
    if (!endpoint) throw new AppError("VALIDATION", 422);
    const customerId = req.session!.sub;
    await withRole("app_customer", { customerId }, async (client) => {
      await client.query("delete from push_subscriptions where customer_id = $1 and endpoint = $2", [
        customerId,
        endpoint,
      ]);
    });
    res.json({ ok: true });
  }),
);

interface PreferencesRow {
  loyalty: boolean;
  rewards: boolean;
  promotions: boolean;
}

const DEFAULT_PREFERENCES: PreferencesRow = { loyalty: true, rewards: true, promotions: false };

pushRouter.get(
  "/me/notification-preferences",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customerId = req.session!.sub;
    const rows = await queryAs<PreferencesRow>(
      "app_customer",
      { customerId },
      "select loyalty, rewards, promotions from notification_preferences where customer_id = $1",
      [customerId],
    );
    res.json(rows[0] ?? DEFAULT_PREFERENCES);
  }),
);

interface PreferencesBody {
  loyalty?: unknown;
  rewards?: unknown;
  promotions?: unknown;
}

pushRouter.patch(
  "/me/notification-preferences",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const body = req.body as PreferencesBody;
    const customerId = req.session!.sub;

    const row = await withRole("app_customer", { customerId }, async (client) => {
      const existing = await client.query<PreferencesRow>(
        "select loyalty, rewards, promotions from notification_preferences where customer_id = $1",
        [customerId],
      );
      const current = existing.rows[0] ?? DEFAULT_PREFERENCES;
      const next: PreferencesRow = {
        loyalty: body.loyalty !== undefined ? readBoolean(body.loyalty, current.loyalty) : current.loyalty,
        rewards: body.rewards !== undefined ? readBoolean(body.rewards, current.rewards) : current.rewards,
        promotions:
          body.promotions !== undefined ? readBoolean(body.promotions, current.promotions) : current.promotions,
      };
      const result = await client.query<PreferencesRow>(
        `insert into notification_preferences (customer_id, loyalty, rewards, promotions)
         values ($1, $2, $3, $4)
         on conflict (customer_id) do update set
           loyalty = excluded.loyalty, rewards = excluded.rewards, promotions = excluded.promotions, updated_at = now()
         returning loyalty, rewards, promotions`,
        [customerId, next.loyalty, next.rewards, next.promotions],
      );
      return result.rows[0]!;
    });

    res.json(row);
  }),
);
