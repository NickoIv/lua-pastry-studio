import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  EmptyState,
  IconButton,
  ImageSurface,
  ProfileIcon,
  SectionHeader,
  Skeleton,
  StarIcon,
} from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { resolveMediaUrl } from "@lua/config";
import { useMenu } from "../data/hooks";
import { LoyaltyBalanceCard } from "../components/LoyaltyBalanceCard";
import { BrandMark } from "../components/BrandMark";
import { HeroCarousel } from "../components/HeroCarousel";
import { ProductRow } from "../components/ProductRow";
import "./HomeScreen.css";

type GreetingKey = "guest.home.greetingMorning" | "guest.home.greetingAfternoon" | "guest.home.greetingEvening";

function greetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return "guest.home.greetingMorning";
  if (hour >= 12 && hour < 18) return "guest.home.greetingAfternoon";
  return "guest.home.greetingEvening";
}

export function HomeScreen() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const menu = useMenu();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const categories =
    menu.status === "success" ? [...menu.data.categories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const selectedCategoryId = activeCategoryId ?? categories[0]?.id ?? null;
  const categoryProducts =
    menu.status === "success" && selectedCategoryId
      ? menu.data.products.filter((p) => p.categoryId === selectedCategoryId)
      : [];
  const featuredCollections =
    menu.status === "success" ? menu.data.collections.filter((c) => c.featured) : [];

  return (
    <div className="lua-home">
      <div className="lua-home__topbar">
        <BrandMark />
        <IconButton
          icon={<ProfileIcon />}
          label={t("nav.profile")}
          variant="solid"
          className="lua-home__avatar-btn"
          onClick={() => navigate("/profile")}
        />
      </div>

      <section className="lua-home__greeting">
        <h1 className="lua-home__greeting-title">{t(greetingKey(new Date().getHours()))}</h1>
        <p className="lua-home__greeting-subtitle">{t("guest.home.greetingSubtitle")}</p>
      </section>

      {menu.status === "loading" ? (
        <Skeleton height={240} />
      ) : (
        <HeroCarousel collections={featuredCollections} locale={locale} />
      )}

      <section className="lua-home__section">
        <LoyaltyBalanceCard />
      </section>

      <section className="lua-home__section">
        <SectionHeader
          title={t("guest.menu.title")}
          action={
            <button className="lua-home__see-all" onClick={() => navigate("/menu")}>
              {t("common.seeAll")}
            </button>
          }
        />
        {categories.length > 0 ? (
          <div className="lua-home__tabs" role="tablist">
            {categories.map((category) => (
              <button
                key={category.id}
                role="tab"
                aria-selected={category.id === selectedCategoryId}
                className={
                  category.id === selectedCategoryId
                    ? "lua-home__tab lua-home__tab--active"
                    : "lua-home__tab"
                }
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.name[locale]}
              </button>
            ))}
          </div>
        ) : null}
        {menu.status === "loading" ? (
          <div className="lua-home__rows">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        ) : categoryProducts.length === 0 ? (
          <EmptyState icon={<StarIcon />} title={t("guest.menu.empty")} />
        ) : (
          <div className="lua-home__rows">
            {categoryProducts.map((product) => (
              <ProductRow key={product.id} product={product} />
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
              <ImageSurface aspectRatio="16 / 9" label={collection.name[locale]} src={resolveMediaUrl(collection.imageUrl)} />
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
