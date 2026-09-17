import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppHeader, Button, Points } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useIssueIdentityToken } from "../data/hooks";
import { QrImage } from "../components/QrImage";
import "./QrScreen.css";

interface RewardQrState {
  mode: "reward";
  redemptionId: string;
  encodedToken: string;
  expiresAt: string;
  rewardTitle: string;
  pointsCost: number;
  balanceBefore: number;
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Rewritten per the owner's manual test finding (product brief §24):
 * the screen used to show almost nothing — a clipped title and a bare
 * code, no reward name, cost, or balance context, and no indication
 * that points aren't deducted yet. Now shows the full picture for a
 * reward QR: what's being picked up, its cost, the balance before and
 * after, and an explicit "not deducted yet" notice.
 */
export function QrScreen() {
  const { t } = useTranslation();
  const issueIdentityToken = useIssueIdentityToken();
  const navigate = useNavigate();
  const location = useLocation();
  const rewardState = location.state as RewardQrState | null;

  const [encodedToken, setEncodedToken] = useState<string | null>(
    rewardState?.encodedToken ?? null,
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(
    rewardState?.expiresAt ?? null,
  );
  const [remaining, setRemaining] = useState(0);

  const refreshIdentityToken = useCallback(async () => {
    const token = await issueIdentityToken();
    setEncodedToken(token.token);
    setExpiresAt(token.expiresAt);
  }, [issueIdentityToken]);

  useEffect(() => {
    // issueIdentityToken awaits the backend before setting state, so
    // this is an ordinary "fetch on mount" effect, not a synchronous
    // render-phase update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!rewardState) void refreshIdentityToken();
  }, [rewardState, refreshIdentityToken]);

  useEffect(() => {
    if (!expiresAt) return;
    // Resyncs the visible countdown to the token's real expiresAt before
    // starting the interval subscription below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(secondsLeft(expiresAt));
    const interval = setInterval(() => {
      const left = secondsLeft(expiresAt);
      setRemaining(left);
      if (left === 0 && !rewardState) void refreshIdentityToken();
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, rewardState, refreshIdentityToken]);

  const isReward = Boolean(rewardState);
  const isExpired = isReward && remaining === 0;

  return (
    <div className="lua-qr-screen">
      <AppHeader title={isReward ? t("guest.qr.rewardTitle") : t("guest.qr.title")} />

      {isReward && rewardState ? (
        <div className="lua-qr-screen__reward-summary">
          <p className="lua-qr-screen__reward-name">{rewardState.rewardTitle}</p>
          <div className="lua-qr-screen__reward-row">
            <span>{t("guest.qr.rewardCostLabel")}</span>
            <Points value={rewardState.pointsCost} />
          </div>
          <div className="lua-qr-screen__reward-row">
            <span>{t("guest.qr.balanceNowLabel")}</span>
            <Points value={rewardState.balanceBefore} />
          </div>
          <div className="lua-qr-screen__reward-row lua-qr-screen__reward-row--total">
            <span>{t("guest.qr.balanceAfterLabel")}</span>
            <Points value={rewardState.balanceBefore - rewardState.pointsCost} />
          </div>
        </div>
      ) : (
        <p className="lua-qr-screen__subtitle">{t("guest.qr.subtitle")}</p>
      )}

      <div
        className={`lua-qr-screen__code${isExpired ? " lua-qr-screen__code--expired" : ""}`}
      >
        {encodedToken ? <QrImage value={encodedToken} /> : null}
      </div>

      {isReward ? <p className="lua-qr-screen__notice">{t("guest.qr.rewardNotice")}</p> : null}

      <p className="lua-qr-screen__timer">
        {isExpired
          ? t("guest.qr.expired")
          : `${t("guest.qr.expiresIn")}: ${formatCountdown(remaining)}`}
      </p>

      {!isReward ? (
        <Button variant="secondary" onClick={() => void refreshIdentityToken()}>
          {t("guest.qr.refresh")}
        </Button>
      ) : isExpired ? (
        <Button variant="secondary" onClick={() => navigate("/club")}>
          {t("guest.qr.newCodeAfterExpiry")}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => navigate("/club")}>
          {t("common.back")}
        </Button>
      )}
    </div>
  );
}
