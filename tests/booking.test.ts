import { describe, it, expect } from "vitest";
import {
  blueprints,
  makeSeats,
  venues,
  cityMovies,
  dates,
  showsFor,
  getShow,
} from "../lib/catalog";
import {
  calculatePrice,
  recommendSeats,
  seededUnavailable,
  type Inventory,
} from "../lib/booking";
describe("city and show relationships", () => {
  it("keeps venues local and supplies independent city catalogs", () => {
    const nagpur = venues.filter((v) => v.cityId === "nagpur");
    const mumbai = venues.filter((v) => v.cityId === "mumbai");
    expect(nagpur.length).toBeGreaterThan(1);
    expect(nagpur.every((n) => !mumbai.some((m) => m.id === n.id))).toBe(true);
    expect(nagpur.every((v) => v.address.includes("Nagpur"))).toBe(true);
    expect(cityMovies("chennai").length).toBeGreaterThan(3);
    expect(cityMovies("invalid")).toEqual([]);
  });
  it("round-trips screening IDs and rejects unsupported dates and movies", () => {
    const v = venues[0];
    const show = showsFor(v, v.movieIds[0], dates()[1])[2];
    expect(getShow(show.id)).toEqual(show);
    expect(showsFor(v, "missing", dates()[0])).toEqual([]);
    expect(getShow("missing~movie~2020-01-01~1030")).toBeUndefined();
    expect(
      getShow([v.id, v.movieIds[0], "2020-01-01", 0].join("~")),
    ).toBeUndefined();
  });
  it("produces structurally different auditoriums with stable unique seat IDs", () => {
    const sizes = blueprints.map((b) => makeSeats(b).length);
    expect(new Set(sizes).size).toBe(5);
    for (const b of blueprints) {
      const seats = makeSeats(b);
      expect(new Set(seats.map((s) => s.id)).size).toBe(seats.length);
      expect(
        seats.every(
          (s) =>
            Number.isFinite(s.x) &&
            Number.isFinite(s.y) &&
            Number.isFinite(s.z),
        ),
      ).toBe(true);
      expect(seats.filter((s) => s.accessible).length).toBe(2);
    }
  });
});
describe("seat recommendations", () => {
  const b = blueprints[0];
  const seats = makeSeats(b);
  const available = (): Inventory =>
    Object.fromEntries(
      seats.map((s) => [s.id, { status: s.blocked ? "blocked" : "available" }]),
    );
  it("returns an adjacent group without crossing an aisle", () => {
    const result = recommendSeats(seats, available(), 4, b);
    expect(result).toHaveLength(4);
    expect(new Set(result.map((s) => s.row)).size).toBe(1);
    result.slice(1).forEach((s, i) => {
      expect(s.number - result[i].number).toBe(1);
      expect(s.x - result[i].x).toBeLessThan(b.spacing * 1.2);
    });
  });
  it("never picks booked, held, or blocked seats", () => {
    const inventory = available();
    const initial = recommendSeats(seats, inventory, 3, b);
    initial.forEach(
      (s, i) =>
        (inventory[s.id] = {
          status: i === 0 ? "booked" : i === 1 ? "held" : "blocked",
        }),
    );
    const result = recommendSeats(seats, inventory, 3, b);
    expect(result).toHaveLength(3);
    expect(result.every((s) => inventory[s.id].status === "available")).toBe(
      true,
    );
  });
  it("respects category preferences and returns no invalid sold-out group", () => {
    const inventory = available();
    expect(
      recommendSeats(seats, inventory, 2, b, "balcony").every(
        (s) => s.category === "balcony",
      ),
    ).toBe(true);
    Object.keys(inventory).forEach(
      (k) => (inventory[k] = { status: "booked" }),
    );
    expect(recommendSeats(seats, inventory, 2, b)).toEqual([]);
  });
  it("preserves luxury recliner pairs", () => {
    const lounge = blueprints[2];
    const list = makeSeats(lounge);
    const inventory: Inventory = Object.fromEntries(
      list.map((s) => [s.id, { status: s.blocked ? "blocked" : "available" }]),
    );
    expect(recommendSeats(list, inventory, 1, lounge)).toEqual([]);
    const pair = recommendSeats(list, inventory, 2, lounge);
    expect(pair).toHaveLength(2);
    expect(pair[0].pair).toBe(pair[1].pair);
  });
});
describe("server-reusable pricing", () => {
  const show = showsFor(venues[0], venues[0].movieIds[0], dates()[0])[0];
  const seats = makeSeats(blueprints[0])
    .filter((s) => s.row === "G")
    .slice(0, 2);
  it("totals category prices, snack quantities, fees and their tax", () => {
    const result = calculatePrice(seats, show, { popcorn: 2, cola: 1 });
    expect(result.tickets).toBe(480);
    expect(result.food).toBe(590);
    expect(result.fee).toBe(56);
    expect(result.tax).toBe(10);
    expect(result.total).toBe(1136);
  });
  it("caps discounts and ignores nonexistent snack product IDs", () => {
    const result = calculatePrice(
      seats,
      show,
      { missing: 999, popcorn: 99 },
      "FIRSTSHOW",
    );
    expect(result.food).toBe(2200);
    expect(result.discount).toBe(48);
    expect(calculatePrice(seats, show, {}, "FORGED").discount).toBe(0);
  });
  it("varies deterministic seeded availability by screening", () => {
    const a = makeSeats(blueprints[0]);
    const first = a.map((s) => seededUnavailable("show-a", s));
    expect(first).toEqual(a.map((s) => seededUnavailable("show-a", s)));
    expect(first).not.toEqual(a.map((s) => seededUnavailable("show-b", s)));
  });
});
