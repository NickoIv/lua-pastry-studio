import { useNavigate } from "react-router-dom";
import {
  Card,
  EmptyState,
  ImageSurface,
  SectionHeader,
  Skeleton,
  StarIcon,
} from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useMenu } from "../data/hooks";
import { LoyaltyBalanceCard } from "../components/LoyaltyBalanceCard";
import { ProductCard } from "../components/ProductCard";
import "./HomeScreen.css";

export function HomeScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const menu = useMenu();

  const mustTry =
    menu.status === "success" ? menu.data.products.filter((p) => p.isMustTry) : [];
  const featuredCollections =
    menu.status === "success" ? menu.data.collections.filter((c) => c.featured) : [];

  return (
    <div className="lua-home">
      <section className="lua-home__hero">
        <p className="lua-home__eyebrow">{t("guest.home.heroEyebrow")}</p>
        <h1 className="lua-home__title">{t("guest.home.heroTitle")}</h1>
        <p className="lua-home__subtitle">{t("guest.home.heroSubtitle")}</p>
      </section>

      <section className="lua-home__section">
        <LoyaltyBalanceCard />
      </section>

      <section className="lua-home__section">
        <SectionHeader
          eyebrow={t("guest.home.mustTryTitle")}
          title={t("guest.home.mustTryTitle")}
          action={
            <button className="lua-home__see-all" onClick={() => navigate("/menu")}>
              {t("common.seeAll")}
            </button>
          }
        />
        {menu.status === "loading" ? (
          <div className="lua-home__grid">
            <Skeleton height={180} />
            <Skeleton height={180} />
          </div>
        ) : mustTry.length === 0 ? (
          <EmptyState icon={<StarIcon />} title={t("guest.menu.empty")} />
        ) : (
          <div className="lua-home__grid">
            {mustTry.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="lua-home__section">
        <SectionHeader
          eyebrow={t("guest.home.collectionsTitle")}
          title={t("guest.home.collectionsTitle")}
        />
        <div className="lua-home__collections">
          {featuredCollections.map((collection) => (
            <Card key={collection.id} padding="none" className="lua-home__collection">
              <ImageSurface aspectRatio="16 / 9" label={collection.name[locale]} />
              <div className="lua-home__collection-body">
                <p className="lua-home__collection-name">{collection.name[locale]}</p>
                {collection.description ? (
                  <p className="lua-home__collection-desc">
                    {collection.description[locale]}
                  </p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
