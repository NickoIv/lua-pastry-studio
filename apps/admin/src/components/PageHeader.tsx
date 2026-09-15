import type { ReactNode } from "react";
import "./PageHeader.css";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="lua-page-header">
      <h1 className="lua-page-header__title">{title}</h1>
      {action}
    </div>
  );
}
