import { useMemo, useState } from "react";
import { AppHeader, EmptyState, SearchIcon, Skeleton } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { useMenu } from "../data/hooks";
import { ProductCard } from "../components/ProductCard";
import "./MenuScreen.css";

export function MenuScreen() {
  const { t, locale } = useTranslation();
  const menu = useMenu();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const products = useMemo(() => {
    if (menu.status !== "success") return [];
    return menu.data.products.filter((product) => {
      const matchesCategory = !activeCategory || product.categoryId === activeCategory;
      const matchesQuery =
        query.trim().length === 0 ||
        product.name[locale].toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [menu, activeCategory, query, locale]);

  return (
    <div className="lua-menu">
      <AppHeader title={t("guest.menu.title")} />

      <div className="lua-menu__search">
        <SearchIcon aria-hidden="true" />
        <input
          className="lua-menu__search-input"
          type="search"
          placeholder={t("guest.menu.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("guest.menu.searchPlaceholder")}
        />
      </div>

      {menu.status === "success" ? (
        <div className="lua-menu__tabs" role="tablist" aria-label={t("guest.menu.title")}>
          <button
            role="tab"
            aria-selected={activeCategory === null}
            className={`lua-menu__tab${activeCategory === null ? " lua-menu__tab--active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            {t("common.seeAll")}
          </button>
          {menu.data.categories.map((category) => (
            <button
              key={category.id}
              role="tab"
              aria-selected={activeCategory === category.id}
              className={`lua-menu__tab${activeCategory === category.id ? " lua-menu__tab--active" : ""}`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name[locale]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="lua-menu__grid">
        {menu.status === "loading" ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={220} />)
        ) : products.length === 0 ? (
          <div className="lua-menu__empty">
            <EmptyState icon={<SearchIcon />} title={t("guest.menu.empty")} />
          </div>
        ) : (
          products.map((product) => <ProductCard key={product.id} product={product} />)
        )}
      </div>
    </div>
  );
}
