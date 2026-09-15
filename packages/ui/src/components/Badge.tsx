import type { HTMLAttributes } from "react";
import "./Badge.css";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  const classes = ["lua-badge", `lua-badge--${tone}`, className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <span className={classes} {...rest} />;
}
