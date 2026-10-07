import { Link, useNavigate } from "react-router-dom";
import { Button, Card, ChevronRightIcon, Points, QrIcon } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useLoyaltyAccount } from "../data/hooks";
import "./LoyaltyBalanceCard.css";

/**
 * Club and QR no longer have their own bottom-nav tabs (owner's
 * reference design uses 3 tabs) — this card is now the primary way in
 * from Home. The top row is its own link to /club; "Показать QR" is a
 * separate sibling button to /qr — kept apart (not nested) so the two
 * destinations stay distinct for screen readers and don't produce one
 * ambiguous "click target".
 */
export function LoyaltyBalanceCard() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const account = useLoyaltyAccount();

  return (
    <Card className="lua-loyalty-card">
      <Link to="/club" className="lua-loyalty-card__header">
        <p className="lua-loyalty-card__eyebrow">{t("guest.home.clubCardTitle")}</p>
        <ChevronRightIcon className="lua-loyalty-card__chevron" />
      </Link>
      <p className="lua-loyalty-card__balance-label">
        {t("guest.home.clubBalanceLabel")}
      </p>
      <p className="lua-loyalty-card__balance">
        {account.status === "success" && account.data ? (
          <Points value={account.data.pointsBalance} locale={locale} />
        ) : (
          "…"
        )}
      </p>
      <Button
        variant="secondary"
        leadingIcon={<QrIcon />}
        onClick={() => navigate("/qr")}
      >
        {t("guest.home.clubCta")}
      </Button>
    </Card>
  );
}
