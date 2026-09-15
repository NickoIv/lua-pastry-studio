import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import "./Card.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

/** When `interactive` is paired with `onClick`, the card behaves like a button for keyboard/screen-reader users too — it never relies on a bare clickable `<div>`. */
export function Card({
  padding = "md",
  interactive = false,
  className,
  onClick,
  onKeyDown,
  ...rest
}: CardProps) {
  const classes = [
    "lua-card",
    `lua-card--padding-${padding}`,
    interactive ? "lua-card--interactive" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const isClickable = interactive && Boolean(onClick);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (!isClickable || event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(event as unknown as MouseEvent<HTMLDivElement>);
    }
  }

  return (
    <div
      className={classes}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : onKeyDown}
      {...rest}
    />
  );
}
