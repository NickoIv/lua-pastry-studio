import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppHeader,
  Button,
  Card,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GiftIcon,
  IconButton,
  Points,
  SectionHeader,
  Skeleton,
  StarIcon,
} from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { API_ERROR_MESSAGES_RU } from "@lua/types";
import { ApiRequestError } from "@lua/data-server";
import { formatPointsValue } from "@lua/utils";
import { BrandMark } from "../components/BrandMark";
import {
  useCustomerProfile,
  useLoyaltyAccount,
  useLoyaltyProgram,
  useLoyaltyTransactions,
  useLocations,
  useMenu,
  useRequestRedemption,
  useRewards,
} from "../data/hooks";
import "./ClubScreen.css";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * A decorative QR-pattern (not a real scannable code — the real,
 * single-use code only ever renders on /qr after a fresh network call,
 * see docs/QR-SECURITY.md). This is just visual texture for the
 * "open your card" shortcut, matching the owner's reference image.
 */
const DECORATIVE_QR_ROWS = [
  "1111101011111",
  "1000101110001",
  "1011101010111",
  "1011101100101",
  "1000100011101",
  "1111101011111",
  "0000000000000",
  "1011011101001",
  "0010100100111",
  "1111101011111",
  "1000101101011",
  "1011101010100",
  "1011101100011",
] as const;

function DecorativeQr() {
  const size = DECORATIVE_QR_ROWS.length;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {DECORATIVE_QR_ROWS.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null,
        ),
      )}
    </svg>
  );
}

export function ClubScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const account = useLoyaltyAccount();
  const program = useLoyaltyProgram();
  const rewards = useRewards();
  const transactions = useLoyaltyTransactions();
  const requestRedemption = useRequestRedemption();
  const profile = useCustomerProfile();
  const locations = useLocations();
  const menu = useMenu();
  const [pendingRewardId, setPendingRewardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balance =
    account.status === "success" && account.data ? account.data.pointsBalance : null;
  const lifetime =
    account.status === "success" && account.data ? account.data.lifetimePointsEarned : 0;
  const tiers =
    program.status === "success" && program.data
      ? [...(program.data.tiers ?? [])].sort((a, b) => a.minLifetimePoints - b.minLifetimePoints)
      : [];
  const nextTier = tiers.find((tier) => tier.minLifetimePoints > lifetime);
  const currentTierFloor =
    [...tiers].reverse().find((tier) => tier.minLifetimePoints <= lifetime)?.minLifetimePoints ?? 0;
  const ringProgress = nextTier
    ? Math.min(
        1,
        Math.max(0, (lifetime - currentTierFloor) / (nextTier.minLifetimePoints - currentTierFloor || 1)),
      )
    : 1;
  const birthdayBonusPoints = program.status === "success" ? program.data?.birthdayBonusPoints : undefined;

  const selectedLocationId =
    profile.status === "success" && profile.data?.homeLocationId
      ? profile.data.homeLocationId
      : (locations.status === "success" ? locations.data[0]?.id : undefined);
  const selectedLocationName =
    locations.status === "success"
      ? locations.data.find((l) => l.id === selectedLocationId)?.shortName
      : undefined;

  /** A reward is only "unavailable here" if its linked product is tracked and explicitly out of stock at the selected location — see product brief §31. */
  function isRewardUnavailableHere(linkedProductId?: string): boolean {
    if (!linkedProductId || !selectedLocationId || menu.status !== "success") return false;
    const product = menu.data.products.find((p) => p.id === linkedProductId);
    if (!product) return false;
    return !product.availableLocationIds.includes(selectedLocationId);
  }

  async function handleRedeem(rewardId: string, pointsCost: number, rewardTitle: string) {
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
          rewardTitle,
          pointsCost,
          balanceBefore: balance ?? 0,
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
      <AppHeader
        title={<BrandMark />}
        leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
      />

      <div className="lua-club__hero">
        <h1 className="lua-club__hero-title">{t("guest.club.title")}</h1>
        <p className="lua-club__hero-subtitle">{t("guest.club.heroSubtitle")}</p>
      </div>

      <Card className="lua-club__ring-card">
        {account.status === "success" && account.data ? (
          <>
            <div className="lua-club__ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="lua-club__ring-track" cx="50" cy="50" r={RING_RADIUS} />
                <circle
                  className="lua-club__ring-progress"
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - ringProgress)}
                />
              </svg>
              <div className="lua-club__ring-center">
                <p className="lua-club__balance">{formatPointsValue(account.data.pointsBalance, locale)}</p>
                <p className="lua-club__balance-label">{t("guest.club.ringLabel")}</p>
              </div>
            </div>
            {nextTier ? (
              <p className="lua-club__ring-copy">
                <span className="lua-club__ring-copy-label">{t("guest.club.nextTierLabel")}</span>
                <span className="lua-club__ring-copy-value">
                  <Points value={nextTier.minLifetimePoints - lifetime} locale={locale} />
                </span>
              </p>
            ) : tiers.length > 0 ? (
              <p className="lua-club__ring-copy">
                <span className="lua-club__ring-copy-label">{t("guest.club.topTierLabel")}</span>
              </p>
            ) : null}
          </>
        ) : (
          <Skeleton height={120} />
        )}
      </Card>

      <Card className="lua-club__qr-card">
        <div className="lua-club__qr-chip">
          <DecorativeQr />
        </div>
        <div className="lua-club__qr-text">
          <p className="lua-club__qr-title">{t("guest.club.qrCardTitle")}</p>
          <p className="lua-club__qr-subtitle">{t("guest.club.qrCardSubtitle")}</p>
          <Button size="md" variant="secondary" onClick={() => navigate("/qr")}>
            {t("guest.club.showQr")}
          </Button>
        </div>
      </Card>

      <section className="lua-club__section">
        <SectionHeader title={t("guest.club.privilegesTitle")} />
        <div className="lua-club__privileges">
          <div className="lua-club__privilege">
            <span className="lua-club__privilege-icon">
              <GiftIcon />
            </span>
            <span className="lua-club__privilege-text">
              {t("guest.club.privilegeBirthday")}
              {birthdayBonusPoints ? (
                <span className="lua-club__privilege-detail">
                  {t("guest.club.privilegeBirthdayDetail", { points: birthdayBonusPoints })}
                </span>
              ) : null}
            </span>
            <ChevronRightIcon className="lua-club__privilege-chevron" />
          </div>
          <div className="lua-club__privilege">
            <span className="lua-club__privilege-icon">
              <ClockIcon />
            </span>
            <span className="lua-club__privilege-text">{t("guest.club.privilegeEarlyAccess")}</span>
            <ChevronRightIcon className="lua-club__privilege-chevron" />
          </div>
          <div className="lua-club__privilege">
            <span className="lua-club__privilege-icon">
              <StarIcon />
            </span>
            <span className="lua-club__privilege-text">{t("guest.club.privilegeSurprises")}</span>
            <ChevronRightIcon className="lua-club__privilege-chevron" />
          </div>
        </div>
      </section>

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
                    {isRewardUnavailableHere(reward.linkedProductId) ? (
                      <span className="lua-club__reward-shortage">
                        {t("guest.club.unavailableHere", { location: selectedLocationName ?? "" })}
                      </span>
                    ) : balance !== null && balance < reward.pointsCost ? (
                      <span className="lua-club__reward-shortage">
                        {t("guest.club.shortBy", { points: reward.pointsCost - balance })}
                      </span>
                    ) : (
                      <Button
                        size="md"
                        variant="secondary"
                        disabled={pendingRewardId === reward.id}
                        onClick={() => handleRedeem(reward.id, reward.pointsCost, reward.title[locale])}
                      >
                        {t("guest.club.redeemButton")}
                      </Button>
                    )}
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
