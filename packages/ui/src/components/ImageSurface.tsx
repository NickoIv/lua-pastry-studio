import { useState } from "react";
import type { HTMLAttributes } from "react";
import "./ImageSurface.css";

export interface ImageSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  aspectRatio?: string;
  /** A real product/collection photo — an uploaded local asset or an admin-pasted URL. Falls back to the placeholder mark if absent or if it fails to load. */
  src?: string;
}

/**
 * Stand-in for a real product/hero photograph when there is no `src`
 * (or it failed to load) — a flat warm surface with a small abstract
 * pastry mark instead of pulling a random internet image (licensing
 * risk), ever rendering a broken `<img>`, or leaning on a giant "LUA"
 * wordmark that reads as an unfinished placeholder rather than a
 * designed empty state. Once a real photo is uploaded (or an admin
 * pastes an external URL), this renders it.
 */
export function ImageSurface({
  label,
  aspectRatio = "1 / 1",
  className,
  style,
  src,
  ...rest
}: ImageSurfaceProps) {
  const [failed, setFailed] = useState(false);
  const classes = ["lua-image-surface", className ?? ""].filter(Boolean).join(" ");
  const showImage = Boolean(src) && !failed;

  return (
    <div className={classes} style={{ aspectRatio, ...style }} {...rest}>
      {showImage ? (
        <img
          className="lua-image-surface__img"
          src={src}
          alt={label ?? ""}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="lua-image-surface__fallback" aria-hidden="true">
            <svg
              className="lua-image-surface__icon"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              {/* An abstract plate/rim mark, deliberately not a face or food
                  illustration — two off-center rings, like a plate glimpsed
                  at an angle. */}
              <circle cx="24" cy="25" r="15" />
              <circle cx="24" cy="25" r="8.5" />
            </svg>
            <span className="lua-image-surface__wordmark">Lua</span>
          </span>
          {label ? <span className="lua-visually-hidden">{label}</span> : null}
        </>
      )}
    </div>
  );
}
