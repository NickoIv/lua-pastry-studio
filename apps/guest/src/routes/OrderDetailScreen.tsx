import { useNavigate, useParams } from "react-router-dom";
import { AppHeader, Card, ChevronLeftIcon, IconButton, Money, Points, Skeleton } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { formatOrderDateTime } from "@lua/utils";
import { useOrder } from "../data/hooks";
import "./OrderDetailScreen.css";

export function OrderDetailScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const order = useOrder(orderId);
  const backButton = (
    <IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />
  );

  if (order.status === "loading") {
    return (
      <div className="lua-order-detail">
        <AppHeader title={t("guest.orders.detailsTitle")} leading={backButton} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (order.status !== "success" || !order.data) {
    return (
      <div className="lua-order-detail">
        <AppHeader title={t("guest.orders.detailsTitle")} leading={backButton} />
        <p className="lua-order-detail__notfound">{t("common.error")}</p>
      </div>
    );
  }

  const data = order.data;

  return (
    <div className="lua-order-detail">
      <AppHeader title={t("guest.orders.detailsTitle")} leading={backButton} />
      <div className="lua-order-detail__body">
        <p className="lua-order-detail__date">
          {formatOrderDateTime(data.createdAt, locale)}
        </p>

        <Card padding="sm" className="lua-order-detail__items">
          {data.items.map((item) => (
            <div key={item.id} className="lua-order-detail__item">
              <span>
                {item.productName}
                {item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </span>
              <Money value={item.lineTotal} locale={locale} />
            </div>
          ))}
        </Card>

        <Card padding="sm" className="lua-order-detail__summary">
          <div className="lua-order-detail__summary-row">
            <span>{t("guest.orders.totalLabel")}</span>
            <Money
              value={data.total}
              locale={locale}
              className="lua-order-detail__total"
            />
          </div>
          <div className="lua-order-detail__summary-row">
            <span>{t("guest.orders.earnedLabel")}</span>
            <Points
              value={data.pointsEarned}
              signed
              locale={locale}
              className="lua-order-detail__points"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
