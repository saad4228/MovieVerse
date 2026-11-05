import type { Blueprint } from "./catalog";

/** The same curved edge is used by the deck, railing and camera collision. */
import { rowArc } from "./seat-layout";

export function balconyFrame(b: Blueprint) {
  if (!b.balcony || b.modelUrl) return null;
  const firstRow = b.rows - (b.balconyRows ?? 3);
  const floor = firstRow * b.slope + (b.balconyElevation ?? 2.3);
  const halfWidth = b.width / 2 - 1.65;
  const front = -b.depth / 2 + 7 + firstRow * b.rowSpacing - 1.05;
  const curve = Math.min(.65, b.rowSpacing * .35);
  const edge = (x: number) => front - rowArc(b, x) - curve * .2 * (x / halfWidth) ** 2;
  return { firstRow, floor, halfWidth, front, curve, edge, rear: b.depth / 2 - .45, thickness: .32, railHeight: 1.02 };
}
