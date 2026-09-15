import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppHeader, Button } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { APP_CONFIG } from "@lua/config";
import { useBackend, CURRENT_CUSTOMER_ID } from "../backend/useBackend";
import { QrCodeArt } from "../components/QrCodeArt";
import "./QrScreen.css";

interface RewardQrState {
  mode: "reward";
  redemptionId: string;
  encodedToken: string;
  expiresAt: string;
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function QrScreen() {
  const { t } = useTranslation();
  const backend = useBackend();
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

  const issueIdentityToken = useCallback(async () => {
    const token = await backend.qr.issueIdentityToken(
      CURRENT_CUSTOMER_ID,
      APP_CONFIG.qrTokenTtlSeconds,
    );
    setEncodedToken(token.encoded);
    setExpiresAt(token.expiresAt);
  }, [backend]);

  useEffect(() => {
    // issueIdentityToken awaits the mock QR service before setting state,
    // so this is an ordinary "fetch on mount" effect, not a synchronous
    // render-phase update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!rewardState) void issueIdentityToken();
  }, [rewardState, issueIdentityToken]);

  useEffect(() => {
    if (!expiresAt) return;
    // Resyncs the visible countdown to the token's real expiresAt before
    // starting the interval subscription below — the standard "sync on
    // prop/dep change, then subscribe" effect shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(secondsLeft(expiresAt));
    const interval = setInterval(() => {
      const left = secondsLeft(expiresAt);
      setRemaining(left);
      if (left === 0 && !rewardState) void issueIdentityToken();
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, rewardState, issueIdentityToken]);

  const isReward = Boolean(rewardState);
  const isExpired = isReward && remaining === 0;

  return (
    <div className="lua-qr-screen">
      <AppHeader title={isReward ? t("guest.qr.rewardTitle") : t("guest.qr.title")} />

      <p className="lua-qr-screen__subtitle">
        {isReward ? t("guest.qr.rewardSubtitle") : t("guest.qr.subtitle")}
      </p>

      <div
        className={`lua-qr-screen__code${isExpired ? " lua-qr-screen__code--expired" : ""}`}
      >
        {encodedToken ? <QrCodeArt value={encodedToken} /> : null}
      </div>

      <p className="lua-qr-screen__timer">
        {isExpired
          ? t("guest.qr.expired")
          : `${t("guest.qr.expiresIn")}: ${formatCountdown(remaining)}`}
      </p>

      {!isReward ? (
        <Button variant="secondary" onClick={() => void issueIdentityToken()}>
          {t("guest.qr.refresh")}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => navigate("/club")}>
          {t("common.back")}
        </Button>
      )}
    </div>
  );
}
