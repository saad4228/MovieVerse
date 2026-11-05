import { makeSeats, type Blueprint, type Seat } from "./catalog";
import { rowArc } from "./seat-layout";
import { balconyFrame } from "./balcony";
export type Point = [number, number, number];
export type CameraView = { label: string; position: Point; target: Point };
export type Preset =
  | "Overview"
  | "From stage"
  | "Balcony"
  | "Bird’s eye"
  | "Tour"
  | "Find seats"
  | "My seat"
  | "Free view"
  | "Viewpoint";
export function screenFrame(b: Blueprint) {
  if (!b.screen && !b.modelUrl) {
    const usableWidth = b.width - 1.6;
    const width = usableWidth * .85;
    const height = width * 9 / 16;
    const y = 1.25 + height / 2;
    // Keep the first-row centre sightline at or below 35 degrees by extending
    // the front apron, rather than moving any bookable seats or stretching video.
    const setback = Math.max(0, (y - 1.5) / Math.tan(35 * Math.PI / 180) - 6.2);
    return { width, height, x: 0, y, z: -b.depth / 2 + .6 - setback, rotationY: 0 };
  }
  const height =
    b.screen?.height ?? Math.min((b.screenWidth * 9) / 16, b.height - 3.2);
  // When room height forces the default screen shorter, reduce its width too
  // so 16:9 trailers do not leave artificial side bars on the physical screen.
  const width = b.screen?.width ?? Math.min(b.screenWidth, (height * 16) / 9);
  return {
    width,
    height,
    x: b.screen?.position[0] ?? 0,
    y: b.screen?.position[1] ?? height / 2 + 1.8,
    z: b.screen?.position[2] ?? -b.depth / 2 + 0.5,
    rotationY: b.screen?.rotationY ?? 0,
  };
}
/** Presentation envelope; seat coordinates and the inventory blueprint stay intact. */
export function auditoriumEnvelope(b: Blueprint) {
  if (b.modelUrl) return { front: -b.depth / 2, rear: b.depth / 2, centre: 0, depth: b.depth, height: b.height };
  const frame = screenFrame(b);
  const front = Math.min(-b.depth / 2, frame.z - .6);
  const rear = b.depth / 2;
  return {
    front, rear, centre: (front + rear) / 2, depth: rear - front,
    height: Math.max(b.height, frame.y + frame.height / 2 + 1.1),
  };
}
export function floorAt(b: Blueprint, z: number, x = 0) {
  // Row platforms start half a pitch ahead of each row centre.
  const row = Math.floor(
    (z + (Math.abs(x) < b.width/2-1.6 ? rowArc(b,x) : 0) + b.depth / 2 - 7 - 0.15 + b.rowSpacing / 2) / b.rowSpacing,
  );
  if (row < 0) return 0;
  if (row >= b.rows) return b.balcony ? (b.rows - 1) * b.slope + (b.balconyElevation ?? 2.3) : 0;
  return row * b.slope + (b.balcony && row >= b.rows - (b.balconyRows ?? 3) ? (b.balconyElevation ?? 2.3) : 0);
}
export function clearanceHeight(b: Blueprint) {
  return Math.min(
    auditoriumEnvelope(b).height - 0.7,
    (b.rows - 1) * b.slope + (b.balcony ? (b.balconyElevation ?? 2.3) : 0) + 2.2,
  );
}
export function screenTarget(b: Blueprint): Point {
  const f = screenFrame(b);
  return [f.x, f.y, f.z];
}
export function seatEye(seat: Seat): Point {
  return [seat.x - .2*Math.sin(seat.rotationY??0), seat.y + 1.5, seat.z - .2*Math.cos(seat.rotationY??0)];
}
export function viewpoints(b: Blueprint): CameraView[] {
  const seats = makeSeats(b);
  const minX = Math.min(...seats.map(s => s.x)), maxX = Math.max(...seats.map(s => s.x));
  const minZ = Math.min(...seats.map(s => s.z)), maxZ = Math.max(...seats.map(s => s.z));
  const centreX = (minX + maxX) / 2;
  const views = [0.12, 0.5, 0.88].flatMap((fraction, row) => [-1, 0, 1].map((side, col) => {
    const targetX = centreX + side * (maxX - minX) * 0.28;
    const targetZ = minZ + (maxZ - minZ) * fraction;
    const region = seats.filter(s => Math.abs(s.z - targetZ) <= b.rowSpacing * 1.5 && Math.abs(s.x - targetX) <= (maxX - minX) / 3);
    const targetY = region.reduce((n, s) => n + s.y + 0.8, 0) / Math.max(1, region.length);
    // Look into the selected seat block from above its aisle. Never aim at the screen.
    const position = clampRoom(b, [centreX + side * b.width * 0.39,
      Math.max(clearanceHeight(b), targetY + 3.8),
      targetZ + (row === 0 ? -1 : 1) * Math.max(3.2, b.depth * 0.12)]);
    return { label: `${["Front", "Middle", "Rear"][row]} ${["left", "centre", "right"][col]}`,
      position, target: [targetX, targetY, targetZ] as Point };
  }));
  if (b.balcony) {
    const balconySeats = seats.filter(s => s.level === 1);
    if (balconySeats.length) {
      const centre = (axis: "x" | "y" | "z") => balconySeats.reduce((sum,s)=>sum+s[axis],0)/balconySeats.length;
      views.push({label:"Balcony seats",position:clampRoom(b,[b.width*.36,auditoriumEnvelope(b).height-.7,maxZ-3]),target:[centre("x"),centre("y")+.8,centre("z")]});
    }
  }
  return views;
}
export function cameraView(
  b: Blueprint,
  preset: Preset,
  seats: Seat[],
  preview: string | null,
  viewIndex: number,
): CameraView {
  const room = auditoriumEnvelope(b);
  const frame = screenFrame(b);
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
  if (preset === "From stage") {
    const z = Math.min(b.depth / 2 - 1.5, Math.max(-b.depth / 2 + 7 + b.rowSpacing * 2, frame.z + frame.width * .9));
    return {
      label: preset,
      position: [0, floorAt(b, z) + 2.5, z],
      target: screenTarget(b),
    };
  }
  if (preset === "Bird’s eye")
    return {
      label: preset,
      position: [0.01, room.height - 0.7, room.rear - 1.4],
      target: [0, 2.2, -b.depth * .14],
    };
  if (preset === "Balcony") {
    const deck = balconyFrame(b);
    if (deck) return {
      label: preset,
      position: [0, deck.floor + 1.65, deck.front + .7],
      target: [frame.x, frame.y * .72, frame.z],
    };
  }
  return {
    label: "Overview",
    position: [
      b.width * 0.3,
      Math.max(clearanceHeight(b), room.height * 0.64),
      b.depth * 0.42,
    ],
    target: [0, frame.y * 0.8, (frame.z - b.depth / 2 + 7) / 2],
  };
}
export function clampRoom(b: Blueprint, p: Point): Point {
  const clamp = (n: number, a: number, z: number) =>
    Math.max(a, Math.min(z, n));
  const x = clamp(p[0], -b.width / 2 + 0.65, b.width / 2 - 0.65);
  const room = auditoriumEnvelope(b);
  const z = clamp(p[2], room.front + 0.65, room.rear - 0.65);
  return [x, clamp(p[1], floorAt(b, z, x) + 1.15, room.height - 0.55), z];
}
export function cameraObstructed(
  b: Blueprint,
  seats: Seat[],
  p: Point,
  exempt?: string | null,
) {
  const [x, y, z] = p;
  if (y < floorAt(b, z, x) + 1.14) return true;
  const deck = balconyFrame(b);
  if (deck && Math.abs(x) <= deck.halfWidth + .2 &&
      Math.abs(z - deck.edge(x)) < .35 && y > deck.floor - deck.thickness - .2 && y < deck.floor + deck.railHeight + .2) return true;
  return seats.some((s) => {
    if (s.id === exempt) return false;
    const wide = s.category === "recliner" ? 0.68 : 0.57;
    const dx = Math.abs(x - s.x),
      dz = z - s.z,
      dy = y - s.y;
    // Expanded proxies include a 0.18m camera radius; no under-chair gap.
    const back = dx < wide + .18 && dz > -.15 && dz < .91 && dy > 0 && dy < 2.01;
    const cushion = dx < wide + .18 && dz > -.9 && dz < .71 && dy > -.18 && dy < 1.1;
    const arms =
      dx > .12 &&
      dx < wide + .28 &&
      dz > -.73 &&
      dz < .71 &&
      dy > -.18 &&
      dy < 1.21;
    return back || cushion || arms;
  });
}
export function safeCameraPath(b: Blueprint, from: Point, to: Point): Point[] {
  const high = Math.min(
    auditoriumEnvelope(b).height - 0.6,
    Math.max(clearanceHeight(b), from[1], to[1]),
  );
  return [[from[0], high, from[2]], [to[0], high, to[2]], to];
}

/** Short swept steps with axis sliding keep free view responsive at obstacles. */
export function slideCamera(b: Blueprint, seats: Seat[], from: Point, desired: Point, exempt?: string | null): Point {
  const to = clampRoom(b, desired);
  const distance = Math.hypot(...to.map((n,i)=>n-from[i]));
  if (distance < .00001) return from;
  const steps = Math.max(1, Math.ceil(distance/.12));
  const delta = to.map((n,i)=>(n-from[i])/steps);
  let safe: Point = [...from];
  const valid = (p:Point) => p[1] >= floorAt(b,p[2],p[0]) + 1.15 && !cameraObstructed(b,seats,p,exempt);
  for (let step=0;step<steps;step++) {
    const next = clampRoom(b,safe.map((n,i)=>n+delta[i]) as Point);
    if (valid(next)) { safe=next; continue; }
    // Vertical escape first, then slide along the larger horizontal component.
    const axes = Math.abs(delta[0])>Math.abs(delta[2]) ? [1,0,2] : [1,2,0];
    for (const axis of axes) {
      const partial:Point=[...safe]; partial[axis]=next[axis];
      if (valid(partial)) safe=partial;
    }
  }
  return safe;
}

/** Geometric observations for the illustrative model, never a fabricated seat rating. */
export function screenViewMetrics(b: Blueprint, seat: Seat) {
  const f=screenFrame(b), eye=seatEye(seat);
  const dx=eye[0]-f.x, dz=eye[2]-f.z;
  const forward=dx*Math.sin(f.rotationY)+dz*Math.cos(f.rotationY);
  const sideways=dx*Math.cos(f.rotationY)-dz*Math.sin(f.rotationY);
  return {
    horizontalSpan: Math.round(Math.abs(Math.atan2(f.width/2-sideways,forward)-Math.atan2(-f.width/2-sideways,forward))*180/Math.PI),
    verticalAngle: Math.round(Math.atan2(f.y-eye[1],Math.hypot(dx,dz))*180/Math.PI),
  };
}

/** Only physically modelled destinations; no fictitious entrance/lobby. */
export function tourViews(b: Blueprint): (CameraView & { description: string; icon: string })[] {
  const seats = makeSeats(b);
  const views = [
    {...cameraView(b, "From stage", seats, null, 0), label: "Screen & stage", description: "Velvet curtains and the full projection aperture", icon: "screen"},
    {...cameraView(b, "Overview", seats, null, 0), label: "Main hall", description: "Seating blocks, illuminated aisles and warm walnut", icon: "hall"},
    ...(b.balcony ? [{...cameraView(b, "Balcony", seats, null, 0), label: "Upper balcony", description: "An elevated audience view across the real balcony edge", icon: "balcony"}] : []),
    {...viewpoints(b)[viewpoints(b).length - 1], label: "Premium seating", description: "Explore the upper rows and individual chairs", icon: "seats"},
  ];
  return views;
}
