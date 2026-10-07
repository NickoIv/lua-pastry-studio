import { Link } from "react-router-dom";
import { Badge, Card, ImageSurface, Money } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { resolveMediaUrl } from "@lua/config";
import type { GuestProduct } from "../data/viewTypes";
import "./ProductRow.css";

/** A compact row variant of ProductCard for the Home screen's by-category list — same destination link, different layout. */
export function ProductRow({ product }: { product: GuestProduct }) {
  const { t, locale } = useTranslation();
  const unavailable = !product.inStockAnywhere;
  return (
    <Link to={`/menu/product/${product.id}`} className="lua-product-row__link">
      <Card padding="sm" className="lua-product-row">
        <div className="lua-product-row__thumb">
          <ImageSurface aspectRatio="1 / 1" label={product.name[locale]} src={resolveMediaUrl(product.imageUrl)} />
        </div>
        <div className="lua-product-row__text">
          <p className="lua-product-row__name">{product.name[locale]}</p>
          <p className="lua-product-row__desc">
            {product.description?.[locale] ?? <Money value={product.price} locale={locale} />}
          </p>
        </div>
        {unavailable ? (
          <Badge tone="neutral">{t("guest.menu.outOfStock")}</Badge>
        ) : (
          <p className="lua-product-row__price">
            <Money value={product.price} locale={locale} />
          </p>
        )}
      </Card>
    </Link>
  );
}
