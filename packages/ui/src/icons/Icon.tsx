import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const defaults: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/**
 * One hand-drawn line-icon set for the whole platform (never emoji, never
 * a second icon pack mixed in) — every icon below shares this stroke
 * style so the set reads as one system.
 */
export function createIcon(paths: ReactNode) {
  return function IconComponent(props: IconProps) {
    return (
      <svg {...defaults} {...props}>
        {paths}
      </svg>
    );
  };
}
