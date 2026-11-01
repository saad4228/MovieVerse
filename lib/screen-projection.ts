export type Point = { x: number; y: number };
/** Perspective projection of a DOM player onto a physical cinema screen. */
export function screenMatrix(
  points: [Point, Point, Point, Point],
  width = 1280,
  height = 720,
): number[] | null {
  const [p0, p1, p2, p3] = points;
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return null;
  const dx1 = p1.x - p2.x,
    dx2 = p3.x - p2.x,
    dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y,
    dy2 = p3.y - p2.y,
    dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 0.001) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant,
    h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const a = p1.x - p0.x + g * p1.x,
    b = p3.x - p0.x + h * p3.x,
    d = p1.y - p0.y + g * p1.y,
    e = p3.y - p0.y + h * p3.y;
  return [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    p0.x,
    p0.y,
    0,
    1,
  ];
}
