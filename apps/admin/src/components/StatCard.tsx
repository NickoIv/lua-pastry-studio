import type { ReactNode } from "react";
import { Card } from "@lua/ui";
import "./StatCard.css";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="lua-stat-card">
      <p className="lua-stat-card__label">{label}</p>
      <p className="lua-stat-card__value">{value}</p>
      {hint ? <p className="lua-stat-card__hint">{hint}</p> : null}
    </Card>
  );
}
