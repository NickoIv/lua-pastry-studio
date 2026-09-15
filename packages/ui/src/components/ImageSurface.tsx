import type { HTMLAttributes } from "react";
import "./ImageSurface.css";

export interface ImageSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  aspectRatio?: string;
}

/**
 * Stand-in for a real product/hero photograph. No brand photography
 * exists locally yet, so this renders a flat warm surface with a
 * monogram instead of pulling a random internet image (which would
 * carry licensing risk) — swap for <img> once real assets land.
 */
export function ImageSurface({
  label,
  aspectRatio = "1 / 1",
  className,
  style,
  ...rest
}: ImageSurfaceProps) {
  const classes = ["lua-image-surface", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes} style={{ aspectRatio, ...style }} {...rest}>
      <span className="lua-image-surface__mark" aria-hidden="true">
        LUA
      </span>
      {label ? <span className="lua-visually-hidden">{label}</span> : null}
    </div>
  );
}
