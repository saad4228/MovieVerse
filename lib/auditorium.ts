import type { Blueprint, Seat } from "./catalog";
export type Point = [number, number, number];
export type CameraView = { label: string; position: Point; target: Point };
export type Preset =
  | "Overview"
  | "From stage"
  | "Balcony"
  | "Bird’s eye"
  | "Tour"
  | "My seat"
  | "Free view"
  | "Viewpoint";
export function screenFrame(b: Blueprint) {
  const height =
    b.screen?.height ?? Math.min((b.screenWidth * 9) / 16, b.height - 3.2);
  return {
    width: b.screen?.width ?? b.screenWidth,
    height,
    x: b.screen?.position[0] ?? 0,
    y: b.screen?.position[1] ?? height / 2 + 1.8,
    z: b.screen?.position[2] ?? -b.depth / 2 + 0.5,
    rotationY: b.screen?.rotationY ?? 0,
  };
}
export function floorAt(b: Blueprint, z: number) {
  // Row platforms start half a pitch ahead of each row centre.
  const row = Math.floor(
    (z + b.depth / 2 - 7 - 0.15 + b.rowSpacing / 2) / b.rowSpacing,
  );
  if (row < 0 || row >= b.rows) return 0;
  return row * b.slope + (b.balcony && row >= b.rows - 3 ? 2.3 : 0);
}
export function clearanceHeight(b: Blueprint) {
  return Math.min(
    b.height - 0.7,
    (b.rows - 1) * b.slope + (b.balcony ? 2.3 : 0) + 2.2,
  );
}
export function screenTarget(b: Blueprint): Point {
  const f = screenFrame(b);
  return [f.x, f.y, f.z];
}
export function seatEye(seat: Seat): Point {
  return [seat.x, seat.y + 1.5, seat.z - 0.2];
}
export function viewpoints(b: Blueprint): CameraView[] {
  const stages = b.rows < 8 ? [0.15, 0.75] : [0.08, 0.5, 0.94];
  return stages
    .flatMap((fraction, i) => {
      const r = Math.round((b.rows - 1) * fraction);
      const z = -b.depth / 2 + 7 + r * b.rowSpacing - 0.35;
      const y = floorAt(b, z) + 2.35;
      return [-1, 0, 1].map((side, j) => ({
        label: `${stages.length === 2 ? ["Front", "Rear"][i] : ["Front", "Middle", "Rear"][i]} ${["left", "centre", "right"][j]}`,
        position: [
          side * b.width * 0.32,
          Math.min(y, b.height - 0.7),
          z,
        ] as Point,
        target: screenTarget(b),
      }));
    })
    .concat(
      b.balcony
        ? [
            {
              label: "Balcony centre",
              position: [0, clearanceHeight(b), b.depth / 2 - 2],
              target: screenTarget(b),
            },
          ]
        : [],
    );
}
export function cameraView(
  b: Blueprint,
  preset: Preset,
  seats: Seat[],
  preview: string | null,
  viewIndex: number,
): CameraView {
  if (preset === "Viewpoint")
    return viewpoints(b)[viewIndex % viewpoints(b).length];
  if (preset === "My seat") {
    const seat = seats.find((s) => s.id === preview);
    if (seat)
      return {
        label: `Seat ${seat.id}`,
        position: seatEye(seat),
        target: screenTarget(b),
      };
  }
  if (preset === "From stage")
    return {
      label: preset,
      position: [0, 3.5, -b.depth / 2 + 3.8],
      target: [0, clearanceHeight(b) - 1, b.depth * 0.25],
    };
  if (preset === "Bird’s eye")
    return {
      label: preset,
      position: [0.01, b.height - 0.7, 1.5],
      target: [0, 0, 1],
    };
  if (preset === "Balcony")
    return {
      label: preset,
      position: [0, clearanceHeight(b), b.depth / 2 - 1.5],
      target: screenTarget(b),
    };
  return {
    label: "Overview",
    position: [
      b.width * 0.36,
      Math.max(clearanceHeight(b), b.height * 0.68),
      b.depth * 0.38,
    ],
    target: [0, screenFrame(b).y * 0.7, -b.depth * 0.18],
  };
}
export function clampRoom(b: Blueprint, p: Point): Point {
  const clamp = (n: number, a: number, z: number) =>
    Math.max(a, Math.min(z, n));
  const x = clamp(p[0], -b.width / 2 + 0.65, b.width / 2 - 0.65);
  const frame = screenFrame(b);
  const z = clamp(
    p[2],
    frame.z + (Math.abs(Math.sin(frame.rotationY)) * frame.width) / 2 + 2.4,
    b.depth / 2 - 0.65,
  );
  return [x, clamp(p[1], floorAt(b, z) + 0.35, b.height - 0.55), z];
}
export function cameraObstructed(
  b: Blueprint,
  seats: Seat[],
  p: Point,
  exempt?: string | null,
) {
  const [x, y, z] = p;
  if (y < floorAt(b, z) + 0.3) return true;
  const balconyZ = -b.depth / 2 + 7 + (b.rows - 3) * b.rowSpacing - 1;
  if (
    b.balcony &&
    Math.abs(z - balconyZ) < 0.4 &&
    y < (b.rows - 3) * b.slope + 2.3 + 0.95
  )
    return true;
  return seats.some((s) => {
    if (s.id === exempt) return false;
    const wide = s.category === "recliner" ? 0.68 : 0.57;
    const dx = Math.abs(x - s.x),
      dz = z - s.z,
      dy = y - s.y;
    const back = dx < wide && dz > 0.03 && dz < 0.73 && dy > 0.55 && dy < 1.83;
    const cushion = dx < wide && dz > -0.72 && dz < 0.53 && dy > 0 && dy < 0.92;
    const arms =
      dx > 0.3 &&
      dx < wide + 0.1 &&
      dz > -0.55 &&
      dz < 0.53 &&
      dy > 0 &&
      dy < 1.03;
    return back || cushion || arms;
  });
}
export function safeCameraPath(b: Blueprint, from: Point, to: Point): Point[] {
  const high = Math.min(
    b.height - 0.6,
    Math.max(clearanceHeight(b), from[1], to[1]),
  );
  return [[from[0], high, from[2]], [to[0], high, to[2]], to];
}
