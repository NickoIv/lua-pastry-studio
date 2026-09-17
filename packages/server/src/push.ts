import webpush from "web-push";
import { env } from "./env";

webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Fire-and-forget: a failed push (expired subscription, browser gone)
 * is never a reason to fail the caller's real operation (e.g. a manual
 * points adjustment). The caller decides whether to also clean up a
 * subscription that comes back 404/410 — see docs/ARCHITECTURE.md
 * "Push notifications".
 */
export async function sendPush(
  subscription: PushSubscriptionKeys,
  payload: { title: string; body: string },
): Promise<{ ok: boolean; shouldRemove: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true, shouldRemove: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return { ok: false, shouldRemove: statusCode === 404 || statusCode === 410 };
  }
}
