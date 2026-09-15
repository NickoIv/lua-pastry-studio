import type { ReactNode } from "react";
import "./BottomNavigation.css";

export interface BottomNavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onSelect: () => void;
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
}

/**
 * Router-agnostic by design: each item carries its own onSelect instead
 * of a `to` string, so this component has no dependency on react-router
 * and can be reused by any app that wires up navigation differently.
 */
export function BottomNavigation({ items }: BottomNavigationProps) {
  return (
    <nav className="lua-bottom-nav" aria-label="Основная навигация">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`lua-bottom-nav__item${item.isActive ? " lua-bottom-nav__item--active" : ""}`}
          aria-current={item.isActive ? "page" : undefined}
          onClick={item.onSelect}
        >
          <span className="lua-bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="lua-bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
