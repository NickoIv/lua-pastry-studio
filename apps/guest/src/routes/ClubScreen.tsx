import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppHeader,
  Badge,
  Button,
  Card,
  GiftIcon,
  Points,
  SectionHeader,
  Skeleton,
} from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { ApiRequestError } from "@lua/data-server";
import {
  useLoyaltyAccount,
  useLoyaltyTransactions,
  useRequestRedemption,
  useRewards,
} from "../data/hooks";
import "./ClubScreen.css";

export function ClubScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const account = useLoyaltyAccount();
  const rewards = useRewards();
  const transactions = useLoyaltyTransactions();
  const requestRedemption = useRequestRedemption();
  const [pendingRewardId, setPendingRewardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance =
    account.status === "success" && account.data ? account.data.pointsBalance : null;

  async function handleRedeem(rewardId: string, pointsCost: number) {
    if (balance !== null && balance < pointsCost) {
      setError(t("guest.club.notEnoughPoints"));
      return;
    }
    setError(null);
    setPendingRewardId(rewardId);
    try {
      const { redemption, token, expiresAt } = await requestRedemption(rewardId);
      navigate("/qr", {
        state: {
          mode: "reward",
          redemptionId: redemption.id,
          encodedToken: token,
          expiresAt,
        },
      });
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? API_ERROR_MESSAGES_RU[err.code]
          : t("common.error"),
      );
    } finally {
      setPendingRewardId(null);
    }
  }

  return (
    <div className="lua-club">
      <AppHeader title={t("guest.club.title")} />

      <Card className="lua-club__balance-card">
        {account.status === "success" && account.data ? (
          <>
            <p className="lua-club__balance">
              <Points value={account.data.pointsBalance} locale={locale} />
            </p>
            <p className="lua-club__balance-label">{t("guest.club.balanceLabel")}</p>
            <Badge tone="accent">{account.data.tier ?? "Lua"}</Badge>
          </>
        ) : (
          <Skeleton height={64} />
        )}
      </Card>

      <div className="lua-club__birthday-banner">{t("guest.club.birthdayBanner")}</div>

      <section className="lua-club__section">
        <SectionHeader title={t("guest.club.rewardsTitle")} />
        {error ? <p className="lua-club__error">{error}</p> : null}
        <div className="lua-club__rewards">
          {rewards.status === "loading"
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} />)
            : rewards.status === "success"
              ? rewards.data.map((reward) => (
                  <Card key={reward.id} padding="sm" className="lua-club__reward">
                    <div className="lua-club__reward-icon">
                      <GiftIcon />
                    </div>
                    <div className="lua-club__reward-text">
                      <p className="lua-club__reward-title">{reward.title[locale]}</p>
                      <p className="lua-club__reward-cost">
                        <Points value={reward.pointsCost} locale={locale} />
                      </p>
                    </div>
                    <Button
                      size="md"
                      variant="secondary"
                      disabled={
                        pendingRewardId === reward.id ||
                        (balance !== null && balance < reward.pointsCost)
                      }
                      onClick={() => handleRedeem(reward.id, reward.pointsCost)}
                    >
                      {t("guest.club.redeemButton")}
                    </Button>
                  </Card>
                ))
              : null}
        </div>
      </section>

      <section className="lua-club__section">
        <SectionHeader title={t("guest.club.historyTitle")} />
        <div className="lua-club__history">
          {transactions.status === "success" ? (
            [...transactions.data]
              .reverse()
              .slice(0, 6)
              .map((tx) => (
                <div key={tx.id} className="lua-club__history-row">
                  <span className="lua-club__history-reason">{tx.reason}</span>
                  <span
                    className={`lua-club__history-points${tx.points < 0 ? " lua-club__history-points--negative" : ""}`}
                  >
                    <Points value={tx.points} signed locale={locale} />
                  </span>
                </div>
              ))
          ) : (
            <Skeleton height={120} />
          )}
        </div>
      </section>
    </div>
  );
}
