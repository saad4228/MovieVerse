import { test, expect } from "@playwright/test";
import { dates, venues, showsFor } from "../../lib/catalog";
import { recommendSeats } from "../../lib/booking";
import type { InventorySnapshot } from "../../lib/providers";

test("homepage discovery links open the matching Explore filters", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const genre = page.getByRole("link", {
    name: "Feel the adrenaline",
    exact: true,
  });
  await expect(genre).toHaveAttribute(
    "href",
    "/explore?collection=all&genre=Action",
  );
  await expect(
    page
      .locator(
        "#now-showing .section-heading a, #now-showing .film-section-heading a",
      )
      .first(),
  ).toHaveAttribute("href", "/explore?collection=now-playing-IN");
  await genre.click();
  await expect(page).toHaveURL(/\/explore\?collection=all&genre=Action$/);
  await expect(page.getByLabel("Filter genre", { exact: true })).toHaveValue(
    "Action",
  );
  await expect(page.locator(".movie-grid .movie-card").first()).toBeVisible();
});

test("same-session concurrent holds retain one complete selection and failed changes preserve it", async ({
  playwright,
  baseURL,
}) => {
  const owner = await playwright.request.newContext({ baseURL });
  const other = await playwright.request.newContext({ baseURL });
  try {
    await owner.get("/api/session");
    await other.get("/api/session");
    const venue = venues.find((venue) => venue.cityId === "pune")!;
    const show = showsFor(venue, "sintel", dates()[5])[1];
    const inventoryUrl = `/api/inventory?show=${encodeURIComponent(show.id)}`;
    const snapshot: InventorySnapshot = await (
      await owner.get(inventoryUrl)
    ).json();
    const first = recommendSeats(
      snapshot.seats,
      snapshot.inventory,
      2,
      snapshot.blueprint,
    ).map((seat) => seat.id);
    for (const id of first) snapshot.inventory[id] = { status: "booked" };
    const second = recommendSeats(
      snapshot.seats,
      snapshot.inventory,
      2,
      snapshot.blueprint,
    ).map((seat) => seat.id);
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);

    const responses = await Promise.all(
      [first, second].map((seats) =>
        owner.post("/api/hold", { data: { showId: show.id, seats } }),
      ),
    );
    expect(responses.map((response) => response.status())).toEqual([200, 200]);
    const after: InventorySnapshot = await (
      await owner.get(inventoryUrl)
    ).json();
    const held = Object.entries(after.inventory)
      .filter(([, seat]) => seat.status === "held" && seat.mine)
      .map(([id]) => id)
      .sort();
    expect([first.slice().sort(), second.slice().sort()]).toContainEqual(held);

    const occupied = recommendSeats(
      after.seats,
      after.inventory,
      2,
      after.blueprint,
    ).map((seat) => seat.id);
    expect(occupied).toHaveLength(2);
    expect(
      (
        await other.post("/api/hold", {
          data: { showId: show.id, seats: occupied },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await owner.post("/api/hold", {
          data: { showId: show.id, seats: [held[0], occupied[0]] },
        })
      ).status(),
    ).toBe(409);
    const retained: InventorySnapshot = await (
      await owner.get(inventoryUrl)
    ).json();
    expect(
      Object.entries(retained.inventory)
        .filter(([, seat]) => seat.status === "held" && seat.mine)
        .map(([id]) => id)
        .sort(),
    ).toEqual(held);
  } finally {
    await owner.post("/api/release", { data: {} });
    await other.post("/api/release", { data: {} });
    await owner.dispose();
    await other.dispose();
  }
});

test("API rejects malformed and oversized JSON without exposing parser details", async ({
  request,
}) => {
  const malformed = await request.post("/api/hold", {
    headers: { "Content-Type": "application/json" },
    data: Buffer.from('{"showId":'),
  });
  expect(malformed.status()).toBe(400);
  expect(await malformed.json()).toEqual({ error: "Please send valid JSON." });
  const oversized = await request.post("/api/hold", {
    data: { showId: "x".repeat(40_001) },
  });
  expect(oversized.status()).toBe(413);
});
