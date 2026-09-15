import type { ReactNode } from "react";
import "./AppHeader.css";

export interface AppHeaderProps {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function AppHeader({ title, leading, trailing }: AppHeaderProps) {
  return (
    <header className="lua-app-header">
      <div className="lua-app-header__slot">{leading}</div>
      <h1 className="lua-app-header__title">{title}</h1>
      <div className="lua-app-header__slot lua-app-header__slot--trailing">
        {trailing}
      </div>
    </header>
  );
}
