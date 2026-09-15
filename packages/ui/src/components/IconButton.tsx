import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: "solid" | "ghost";
}

/** Always requires an accessible `label` — icon-only buttons must never ship without one. */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  ...rest
}: IconButtonProps) {
  const classes = ["lua-icon-button", `lua-icon-button--${variant}`, className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} aria-label={label} title={label} {...rest}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
