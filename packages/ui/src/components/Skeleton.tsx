import "./Skeleton.css";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  radius,
  className,
}: SkeletonProps) {
  const classes = ["lua-skeleton", className ?? ""].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius ?? "var(--lua-radius-sm)" }}
    />
  );
}
