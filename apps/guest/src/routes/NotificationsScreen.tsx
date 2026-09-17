import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader, Card, ChevronLeftIcon, IconButton, Skeleton } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import {
  useNotificationPreferences,
  usePushPublicKey,
  useSubscribePush,
  useUnsubscribePush,
  useUpdateNotificationPreferences,
} from "../data/hooks";
import { getExistingSubscription, getPushSupportState, subscribeToPush, toSubscriptionPayload } from "../push";
import "./NotificationsScreen.css";

type Status = "checking" | "unsupported" | "ios-needs-install" | "permission-denied" | "subscribed" | "unsubscribed";

/**
 * Makes the previously-dead "Notifications" Profile row real (product
 * brief §20). Every state below is a genuine browser/permission state,
 * not a placeholder — including the iOS-specific guidance, since Web
 * Push on iOS Safari only works for a Home-Screen-installed PWA and
 * there's no way (and no reason to try) to fake that locally over LAN
 * HTTP. See docs/ARCHITECTURE.md "Push notifications" / product brief §37.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicKey = usePushPublicKey();
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const subscribePushApi = useSubscribePush();
  const unsubscribePushApi = useUnsubscribePush();
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function detect() {
      const support = getPushSupportState();
      if (support === "unsupported") return setStatus("unsupported");
      if (support === "ios-needs-install") return setStatus("ios-needs-install");
      if (Notification.permission === "denied") return setStatus("permission-denied");
      const existing = await getExistingSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    void detect();
  }, []);

  async function handleEnable() {
    if (!publicKey.data) {
      setError(t("common.error"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("permission-denied");
        return;
      }
      const subscription = await subscribeToPush(publicKey.data);
      await subscribePushApi(toSubscriptionPayload(subscription));
      setStatus("subscribed");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const existing = await getExistingSubscription();
      if (existing) {
        await unsubscribePushApi(existing.endpoint);
        await existing.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const statusText: Record<Status, string> = {
    checking: t("common.loading"),
    unsupported: t("guest.notifications.statusUnsupported"),
    "ios-needs-install": t("guest.notifications.iosInstallRequired"),
    "permission-denied": t("guest.notifications.statusDenied"),
    subscribed: t("guest.notifications.statusSubscribed"),
    unsubscribed: t("guest.notifications.statusUnsubscribed"),
  };

  const canToggle = status === "subscribed" || status === "unsubscribed";

  return (
    <div className="lua-notifications">
      <AppHeader
        title={t("guest.notifications.title")}
        leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
      />

      <Card padding="sm" className="lua-notifications__status">
        <p>{statusText[status]}</p>
        {canToggle ? (
          <button
            type="button"
            className="lua-notifications__toggle"
            disabled={busy}
            onClick={() => void (status === "subscribed" ? handleDisable() : handleEnable())}
          >
            {status === "subscribed" ? t("guest.notifications.disableButton") : t("guest.notifications.enableButton")}
          </button>
        ) : null}
        {error ? <p className="lua-notifications__error">{error}</p> : null}
      </Card>

      {preferences.status === "loading" ? (
        <Skeleton height={120} />
      ) : preferences.status === "success" ? (
        <Card padding="sm" className="lua-notifications__categories">
          {(
            [
              ["loyalty", t("guest.notifications.categoryLoyalty")],
              ["rewards", t("guest.notifications.categoryRewards")],
              ["promotions", t("guest.notifications.categoryPromotions")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="lua-notifications__category-row">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={preferences.data[key]}
                onChange={async (e) => {
                  await updatePreferences({ [key]: e.target.checked });
                  preferences.refresh();
                }}
              />
            </label>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
