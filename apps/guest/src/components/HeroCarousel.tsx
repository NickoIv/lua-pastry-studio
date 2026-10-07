import { useRef, useState } from "react";
import { ImageSurface } from "@lua/ui";
import { resolveMediaUrl } from "@lua/config";
import type { LocaleCode } from "@lua/types";
import type { GuestCollection } from "../data/viewTypes";
import "./HeroCarousel.css";

export function HeroCarousel({
  collections,
  locale,
}: {
  collections: GuestCollection[];
  locale: LocaleCode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (collections.length === 0) return null;

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.min(collections.length - 1, Math.max(0, index)));
  }

  return (
    <div className="lua-hero-carousel">
      <div className="lua-hero-carousel__track" ref={trackRef} onScroll={handleScroll}>
        {collections.map((collection) => (
          <div
            key={collection.id}
            className={
              collection.imageUrl
                ? "lua-hero-carousel__slide"
                : "lua-hero-carousel__slide lua-hero-carousel__slide--placeholder"
            }
          >
            <ImageSurface
              className="lua-hero-carousel__image"
              aspectRatio="4 / 3"
              label={collection.name[locale]}
              src={resolveMediaUrl(collection.imageUrl)}
            />
            {collection.imageUrl ? <div className="lua-hero-carousel__scrim" /> : null}
            <div className="lua-hero-carousel__text">
              <strong>{collection.name[locale]}</strong>
              {collection.description ? <span>{collection.description[locale]}</span> : null}
            </div>
          </div>
        ))}
      </div>
      {collections.length > 1 ? (
        <div className="lua-hero-carousel__dots">
          {collections.map((collection, i) => (
            <i
              key={collection.id}
              className={i === activeIndex ? "lua-hero-carousel__dot lua-hero-carousel__dot--active" : "lua-hero-carousel__dot"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
