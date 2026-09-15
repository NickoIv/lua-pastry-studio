import { useNavigate } from "react-router-dom";
import { Button, Card, Points, QrIcon } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useLoyaltyAccount } from "../backend/hooks";
import "./LoyaltyBalanceCard.css";

export function LoyaltyBalanceCard() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const account = useLoyaltyAccount();

  return (
    <Card className="lua-loyalty-card">
      <p className="lua-loyalty-card__eyebrow">{t("guest.home.clubCardTitle")}</p>
      <p className="lua-loyalty-card__balance-label">
        {t("guest.home.clubBalanceLabel")}
      </p>
      <p className="lua-loyalty-card__balance">
        {account.status === "success" ? (
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
