import { useMemo } from "react";
import "./QrCodeArt.css";

const GRID = 15;

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FINDER_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, GRID - 7],
  [GRID - 7, 0],
];

function isFinderZone(row: number, col: number): boolean {
  return FINDER_ORIGINS.some(
    ([r, c]) => row >= r && row < r + 7 && col >= c && col < c + 7,
  );
}

/**
 * A deterministic, QR-shaped pattern derived from the token string — not
 * a real scannable QR encoder. Good enough to demonstrate the guest/staff
 * flows visually; swapping in a real encoder (e.g. the `qrcode` package)
 * is a follow-up, not an architecture change — see docs/ARCHITECTURE.md.
 */
export function QrCodeArt({ value }: { value: string }) {
  const cells = useMemo(() => {
    const rand = mulberry32(hashString(value));
    const grid: boolean[][] = [];
    for (let row = 0; row < GRID; row++) {
      const line: boolean[] = [];
      for (let col = 0; col < GRID; col++) {
        line.push(isFinderZone(row, col) ? false : rand() > 0.56);
      }
      grid.push(line);
    }
    return grid;
  }, [value]);

  return (
    <div className="lua-qr-art" role="img" aria-label="QR код">
      <svg viewBox={`0 0 ${GRID} ${GRID}`} className="lua-qr-art__svg">
        <rect width={GRID} height={GRID} fill="#fff" />
        {cells.map((line, row) =>
          line.map(
            (on, col) =>
              on && (
                <rect
                  key={`${row}-${col}`}
                  x={col}
                  y={row}
                  width={1}
                  height={1}
                  fill="#251b16"
                />
              ),
          ),
        )}
        {FINDER_ORIGINS.map(([r, c]) => (
          <g key={`${r}-${c}`} transform={`translate(${c} ${r})`}>
            <rect width={7} height={7} fill="#251b16" />
            <rect x={1} y={1} width={5} height={5} fill="#fff" />
            <rect x={2} y={2} width={3} height={3} fill="#251b16" />
          </g>
        ))}
      </svg>
    </div>
  );
}
