import { useNavigate } from "react-router-dom";
import {
  AppHeader,
  Card,
  ChevronRightIcon,
  EmptyState,
  Money,
  OrdersIcon,
  Points,
  Skeleton,
} from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { formatOrderDateTime } from "@lua/utils";
import { useOrders } from "../backend/hooks";
import "./OrdersScreen.css";

export function OrdersScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const orders = useOrders();

  return (
    <div className="lua-orders">
      <AppHeader title={t("guest.orders.title")} />
      <div className="lua-orders__list">
        {orders.status === "loading" ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={88} />)
        ) : orders.status === "success" && orders.data.length === 0 ? (
          <EmptyState icon={<OrdersIcon />} title={t("guest.orders.empty")} />
        ) : orders.status === "success" ? (
          orders.data.map((order) => (
            <Card
              key={order.id}
              interactive
              padding="sm"
              className="lua-orders__row"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="lua-orders__row-text">
                <p className="lua-orders__row-date">
                  {formatOrderDateTime(order.createdAt, locale)}
                </p>
                <p className="lua-orders__row-items">
                  {order.items.map((item) => item.productName).join(", ")}
                </p>
              </div>
              <div className="lua-orders__row-meta">
                <Money
                  value={order.total}
                  locale={locale}
                  className="lua-orders__row-total"
                />
                <Points
                  value={order.pointsEarned}
                  signed
                  locale={locale}
                  className="lua-orders__row-points"
                />
              </div>
              <ChevronRightIcon className="lua-orders__row-chevron" />
            </Card>
          ))
        ) : null}
      </div>
    </div>
  );
}
