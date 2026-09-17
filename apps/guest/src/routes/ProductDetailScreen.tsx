import { useNavigate, useParams } from "react-router-dom";
import { AppHeader, Badge, ChevronLeftIcon, IconButton, ImageSurface, Money, Skeleton } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { resolveMediaUrl } from "@lua/config";
import { useCustomerProfile, useLocations, useProduct } from "../data/hooks";
import "./ProductDetailScreen.css";

const ALLERGEN_LABEL: Record<string, string> = {
  milk: "Молоко",
  nuts: "Орехи",
  gluten: "Глютен",
  egg: "Яйца",
  soy: "Соя",
};

/**
 * The product detail flow that was completely missing (product brief
 * §12) — reads the product straight out of the already-loaded menu
 * list (useMenu/useProduct) rather than a second network round trip,
 * and shows availability at the guest's currently selected location
 * (§19/§31), not just "in stock somewhere".
 */
export function ProductDetailScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const product = useProduct(productId);
  const profile = useCustomerProfile();
  const locations = useLocations();

  const selectedLocationId =
    profile.status === "success" && profile.data?.homeLocationId
      ? profile.data.homeLocationId
      : (locations.status === "success" ? locations.data[0]?.id : undefined);
  const selectedLocation =
    locations.status === "success" ? locations.data.find((l) => l.id === selectedLocationId) : undefined;

  if (product.status === "loading") {
    return (
      <div className="lua-product-detail">
        <AppHeader
          title={t("guest.menu.detailTitle")}
          leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
        />
        <Skeleton height={360} />
      </div>
    );
  }

  if (!product.data) {
    return (
      <div className="lua-product-detail">
        <AppHeader
          title={t("guest.menu.detailTitle")}
          leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
        />
        <p className="lua-product-detail__notfound">{t("common.error")}</p>
      </div>
    );
  }

  const p = product.data;
  const availableHere = selectedLocationId ? p.availableLocationIds.includes(selectedLocationId) : p.inStockAnywhere;

  return (
    <div className="lua-product-detail">
      <AppHeader
        title={p.name[locale]}
        leading={<IconButton icon={<ChevronLeftIcon />} label={t("common.back")} onClick={() => navigate(-1)} />}
      />

      <div className="lua-product-detail__image">
        <ImageSurface aspectRatio="4 / 3" label={p.name[locale]} src={resolveMediaUrl(p.imageUrl)} />
      </div>

      <div className="lua-product-detail__body">
        <div className="lua-product-detail__badges">
          {p.isMustTry ? <Badge tone="accent">{t("guest.menu.mustTry")}</Badge> : null}
          {p.isNew ? <Badge tone="success">{t("guest.menu.new")}</Badge> : null}
          {p.isSeasonal ? <Badge tone="warning">{t("guest.menu.seasonal")}</Badge> : null}
        </div>

        <h2 className="lua-product-detail__name">{p.name[locale]}</h2>
        <p className="lua-product-detail__price">
          <Money value={p.price} locale={locale} />
        </p>

        {p.description?.[locale] ? <p className="lua-product-detail__description">{p.description[locale]}</p> : null}

        <div className="lua-product-detail__section">
          <p className="lua-product-detail__section-title">{t("guest.menu.allergens")}</p>
          <p className="lua-product-detail__allergens">
            {p.allergens.length > 0
              ? p.allergens.map((a) => ALLERGEN_LABEL[a] ?? a).join(", ")
              : t("guest.menu.noAllergens")}
          </p>
        </div>

        <div className="lua-product-detail__section">
          <p className="lua-product-detail__section-title">{t("guest.profile.myLocationTitle")}</p>
          {selectedLocation ? (
            <Badge tone={availableHere ? "success" : "neutral"}>
              {availableHere
                ? t("guest.menu.availableAt", { location: selectedLocation.shortName })
                : t("guest.menu.unavailableAt", { location: selectedLocation.shortName })}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
