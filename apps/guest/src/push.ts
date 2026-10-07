/**
 * Standards-based Web Push client helpers — no third-party SDK.
 * See docs/ARCHITECTURE.md "Push notifications" for the local/iOS
 * limitations this deliberately doesn't try to paper over (product
 * brief §37): iOS Safari only supports Web Push for a PWA installed
 * to the Home Screen, and only over a secure (HTTPS or localhost)
 * origin — a phone reached over plain LAN HTTP will correctly report
 * "unsupported" here, which is real browser behavior, not a bug.
 */

export type PushSupportState = "unsupported" | "ios-needs-install" | "supported";

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag for "launched from Home Screen".
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function getPushSupportState(): PushSupportState {
  const hasApis = "serviceWorker" in navigator && "PushManager" in window;
  if (!hasApis) {
    // Real iOS Safari (not installed) genuinely has no PushManager at
    // all pre-installation — that's the specific case worth naming
    // instead of a generic "unsupported".
    return isIOS() && !isStandalone() ? "ios-needs-install" : "unsupported";
  }
  return "supported";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await registerServiceWorker();
  if (!registration) throw new Error("Service worker unavailable");
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export function toSubscriptionPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}
