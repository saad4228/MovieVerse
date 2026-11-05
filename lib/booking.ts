import { couponDiscount } from "./checkout-offers";
import {
  categories,
  snacks,
  type Blueprint,
  type Seat,
  type Show,
} from "./catalog";
export type Inventory = Record<
  string,
  {
    status: "available" | "booked" | "held" | "blocked";
    mine?: boolean;
    expires?: number;
  }
>;

export function screeningStarted(show: Show, now = Date.now()) {
  return Date.parse(`${show.date}T${show.time}:00+05:30`) <= now;
}

/** Shared by hold and checkout so both enforce the same physical-seat rules. */
export function selectionError(
  ids: string[],
  seats: Seat[],
): string | undefined {
  if (new Set(ids).size !== ids.length) return "Duplicate seat.";
  const selected = seats.filter((seat) => ids.includes(seat.id));
  if (selected.length !== ids.length || selected.some((seat) => seat.blocked)) {
    return "Invalid seat selection.";
  }
  if (
    selected.some(
      (seat) =>
        seat.pair &&
        !selected.some(
          (other) => other.id !== seat.id && other.pair === seat.pair,
        ),
    )
  ) {
    return "Recliner seats are sold in pairs. Please select both seats.";
  }
}
export function seatPrice(seat: Seat, show: Show) {
  return (
    (seat.classDefinition?.price ??
      categories.find((c) => c.id === seat.category)?.price ??
      160) +
    show.price -
    160
  );
}
export function calculatePrice(
  seats: Seat[],
  show: Show,
  cart: Record<string, number>,
  promo = "",
  products = snacks,
) {
  const tickets = seats.reduce((sum, s) => sum + seatPrice(s, show), 0);
  const food = products.reduce(
    (sum, s) => sum + s.price * Math.max(0, Math.min(10, cart[s.id] || 0)),
    0,
  );
  const fee = seats.length * 28;
  const tax = Math.round(fee * 0.18);
  const discount = couponDiscount(promo, tickets, food);
  return {
    tickets,
    food,
    fee,
    tax,
    discount,
    total: tickets + food + fee + tax - discount,
  };
}
export function recommendSeats(
  seats: Seat[],
  inventory: Inventory,
  count: number,
  b: Blueprint,
  category = "all",
) {
  let best: Seat[] = [];
  let bestScore = Infinity;
  for (const first of seats) {
    if (category !== "all" && first.category !== category) continue;
    const candidate = Array.from({ length: count }, (_, i) =>
      seats.find((s) => s.row === first.row && s.number === first.number + i),
    );
    if (
      candidate.some(
        (s) =>
          !s ||
          s.blocked ||
          !["available"].includes(inventory[s.id]?.status ?? "blocked"),
      )
    )
      continue;
    const group = candidate as Seat[];
    if (
      group.some(
        (s, i) =>
          i > 0 &&
          (Math.abs(s.x - group[i - 1].x) > b.spacing * 1.2 ||
            s.category !== first.category),
      )
    )
      continue;
    if (
      group.some((s) => s.pair) &&
      group.some((s) => !group.some((t) => t.id !== s.id && t.pair === s.pair))
    )
      continue;
    const cx = group.reduce((n, s) => n + s.x, 0) / count;
    const ideal = -b.depth / 2 + 7 + b.rows * b.rowSpacing * 0.63;
    const score = Math.abs(cx) * 1.4 + Math.abs(first.z - ideal);
    if (score < bestScore) {
      best = group;
      bestScore = score;
    }
  }
  return best;
}
export function seededUnavailable(
  showId: string,
  seat: Seat,
): "available" | "booked" | "blocked" {
  let n = 0;
  for (const c of showId + seat.id) n = ((n << 5) - n + c.charCodeAt(0)) | 0;
  return seat.blocked
    ? "blocked"
    : Math.abs(n) % 17 < 3
      ? "booked"
      : "available";
}
export const rupees = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
