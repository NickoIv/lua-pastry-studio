import type { Product } from "@lua/types";
import { Badge, Card, ImageSurface, Money } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import "./ProductCard.css";

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useTranslation();
  return (
    <Card padding="none" className="lua-product-card">
      <ImageSurface aspectRatio="4 / 3" label={product.name[locale]} />
      <div className="lua-product-card__body">
        <div className="lua-product-card__badges">
          {product.isMustTry ? (
            <Badge tone="accent">{t("guest.menu.mustTry")}</Badge>
          ) : null}
          {product.isNew ? <Badge tone="success">{t("guest.menu.new")}</Badge> : null}
          {product.isSeasonal ? (
            <Badge tone="warning">{t("guest.menu.seasonal")}</Badge>
          ) : null}
        </div>
        <p className="lua-product-card__name">{product.name[locale]}</p>
        <p className="lua-product-card__price">
          <Money value={product.price} locale={locale} />
        </p>
      </div>
    </Card>
  );
}
