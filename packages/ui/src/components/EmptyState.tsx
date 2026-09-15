import type { ReactNode } from "react";
import "./EmptyState.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="lua-empty-state" role="status">
      {icon ? (
        <div className="lua-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="lua-empty-state__title">{title}</p>
      {description ? <p className="lua-empty-state__description">{description}</p> : null}
      {action ? <div className="lua-empty-state__action">{action}</div> : null}
    </div>
  );
}
