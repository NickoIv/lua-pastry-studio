import type { ReactNode } from "react";
import "./SectionHeader.css";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  as: Tag = "h2",
}: SectionHeaderProps) {
  return (
    <div className="lua-section-header">
      <div className="lua-section-header__text">
        {eyebrow ? <p className="lua-section-header__eyebrow">{eyebrow}</p> : null}
        <Tag className="lua-section-header__title">{title}</Tag>
      </div>
      {action ? <div className="lua-section-header__action">{action}</div> : null}
    </div>
  );
}
