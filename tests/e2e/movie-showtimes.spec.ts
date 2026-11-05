import { test, expect } from "@playwright/test";
import { dates, showsFor, type Movie, type Venue } from "../../lib/catalog";

test("movie-first filters, sorting and shared city remain consistent", async ({ page }) => {
  await page.goto("/movies/jailer-2");
  const section = page.locator("#showtimes");
  await expect(section.locator("h2").first()).toHaveText(/Jailer 2 in Chennai/i);
  await section.getByRole("button", { name: /TOMORROW/ }).click();
  await section.getByRole("group", { name: "Show language", exact: true }).getByRole("button", { name: "Hindi", exact: true }).click();
  await section.getByRole("navigation", { name: "Screening city" }).getByRole("button", { name: "Nagpur", exact: true }).click();
  await expect(section.locator("h2").first()).toHaveText(/Jailer 2 in Nagpur/i);
  await expect(section.getByRole("button", { name: /TOMORROW/ })).toHaveAttribute("aria-pressed", "true");
  await expect(section.getByRole("group", { name: "Show language", exact: true }).getByRole("button", { name: "Hindi", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (const tile of await section.locator(".screening-slot").all()) await expect(tile).toContainText("Hindi");
  await section.getByRole("button", { name: "Reset filters", exact: true }).click();
  await section.getByRole("group", { name: "Show format", exact: true }).getByRole("button", { name: "IMAX", exact: true }).click();
  for (const tile of await section.locator(".screening-slot").all()) await expect(tile).toContainText("IMAX");
  await section.getByRole("button", { name: "Reset filters", exact: true }).click();
  await section.getByLabel("Sort showtime cinemas").selectOption("Lowest price");
  const costs = await section.locator(".screening-row").evaluateAll(rows => rows.map(row => Math.min(...Array.from(row.querySelectorAll(".screening-slot>small:not(.screening-stock)"), e => Number(e.textContent!.replace(/[^0-9]/g, ""))))));
  expect(costs).toEqual([...costs].sort((a, b) => a - b));
  await section.getByLabel("Sort showtime cinemas").selectOption("Most shows");
  const counts = await section.locator(".screening-row").evaluateAll(rows => rows.map(r => r.querySelectorAll(".screening-slot").length));
  expect(counts).toEqual([...counts].sort((a, b) => b - a));
  await expect(section.getByLabel("Sort showtime cinemas").locator("option")).not.toContainText(["Nearest"]);
  await expect(section).toContainText("Illustrative venues");
  await expect(section.locator(".screening-venue").first()).not.toContainText("km away");
  await page.getByRole("link", { name: "Back to movies", exact: true }).click();
  await expect(page.getByRole("button", { name: "Nagpur", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nagpur", exact: true }).click();
  await page.getByPlaceholder("Search for your city").fill("Mumbai");
  await page.getByRole("button", { name: "Mumbai", exact: true }).click();
  await page.goto("/movies/leo");
  await expect(page.locator(".screening-header h2")).toHaveText(/Leo in Mumbai/i);
});

test("inventory states are explicit, sold-out disabled and failed requests stay unverified", async ({ page }) => {
  let fail = false;
  await page.route("**/api/show-availability?**", async route => {
    if (fail) return route.fulfill({ status: 503, body: "Unavailable" });
    const ids = new URL(route.request().url()).searchParams.get("shows")!.split(",");
    await route.fulfill({ json: { summaries: Object.fromEntries(ids.map((id, i) => [id, { status: i === 0 ? "sold-out" : i === 1 ? "limited" : "available", available: i === 0 ? 0 : i === 1 ? 3 : 100, total: 150, checked: new Date().toISOString() }])) } });
  });
  await page.goto("/movies/jailer-2");
  await expect(page.locator(".screening-slot.sold-out")).toBeDisabled();
  await expect(page.locator(".screening-slot.limited")).toContainText("3 demo seats left");
  await page.getByLabel("Show availability").selectOption("Sold out");
  await expect(page.locator(".screening-slot")).toHaveCount(1);
  await page.getByLabel("Show availability").selectOption("All");
  fail = true;
  await page.getByRole("button", { name: /TOMORROW/ }).click();
  await expect(page.locator(".screening-slot.available")).toHaveCount(0);
  await expect(page.locator(".screening-slot.unknown").first()).toContainText("Availability unverified");
  await expect(page.locator(".screening-pick")).toHaveCount(0);
});

test("exact screening identity reaches existing seat inventory", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const movie = catalog.movies.find((m: Movie) => m.id === "jailer-2");
  const venue = catalog.venues.find((v: Venue) => v.cityId === "chennai" && v.movieIds.includes(movie.id));
  const show = showsFor(venue, movie.id, dates()[1], catalog.movies)[1];
  await page.goto(`/movies/${movie.id}`);
  await page.getByRole("button", { name: /TOMORROW/ }).click();
  await page.getByRole("button", { name: `${show.time} ${movie.title} at ${venue.name}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(show.id)));
  await expect(page.getByRole("button", { name: "Best 2 seats" })).toBeEnabled();
  const snapshot = await (await request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
  for (const field of ["id", "movieId", "venueId", "blueprintId", "auditoriumId", "date", "time", "language", "format"] as const) expect(snapshot.show[field]).toBe(show[field]);
  await expect(page.locator("canvas")).toBeVisible();
});

for (const width of [1440, 768, 390]) {
  test(`movie discovery remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/movies/jailer-2");
    await expect(page.locator(".screening-row").first()).toBeVisible();
    await page.locator("#showtimes").evaluate(e => e.scrollIntoView({ behavior: "instant" }));
    if (width < 700) {
      await expect(page.locator(".screening-filters")).toBeHidden();
      await page.getByRole("button", { name: "Filters", exact: true }).click();
      await expect(page.getByLabel("Cinema experience")).toBeVisible();
      await page.getByRole("button", { name: "Filters", exact: true }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/movie-discovery-${width}.png` });
    await page.locator(".screening-row").first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/movie-discovery-rows-${width}.png` });
    expect(await page.locator(".screening-slot").first().evaluate(e => e.clientWidth >= 100 && e.clientHeight >= 44)).toBe(true);
  });
}
