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
 * (or it failed to load) — a flat warm surface with a monogram instead
 * of pulling a random internet image (licensing risk) or ever rendering
 * a broken `<img>`. Once Admin's local media upload (§17/§18) supplies
 * a real image, this renders it.
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
          <span className="lua-image-surface__mark" aria-hidden="true">
            LUA
          </span>
          {label ? <span className="lua-visually-hidden">{label}</span> : null}
        </>
      )}
    </div>
  );
}
