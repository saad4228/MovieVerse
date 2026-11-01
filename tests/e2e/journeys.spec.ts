import { test, expect } from "@playwright/test";
import {
  dates,
  venues,
  showsFor,
  blueprints,
  makeSeats,
} from "../../lib/catalog";
import { recommendSeats } from "../../lib/booking";

test("Nagpur movie-first journey, failure recovery, booking, QR and history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "MOVIEVERSE", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chennai", exact: true }).click();
  await page.getByPlaceholder("Search for your city").fill("Nag");
  await page.getByRole("button", { name: "Nagpur", exact: true }).click();
  await page.goto("/movies");
  await expect(
    page.getByRole("heading", { name: "Now showing in Nagpur." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Jailer 2 movie poster/ }).click();
  await page.locator("#showtimes").scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: /18:30 Jailer 2 at Orange City Screens/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Best 2 seats" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Best 2 seats" }).click();
  await expect(
    page.getByRole("button", { name: "Continue · Add snacks" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await expect(page.locator(".map-seat.picked")).toHaveCount(2);
  await page.getByRole("button", { name: "Continue · Add snacks" }).click();
  await expect(
    page.getByRole("heading", { name: /A little crunch/ }),
  ).toBeVisible();
  await page
    .locator(".snack-card")
    .filter({
      has: page.getByRole("heading", { name: "Classic salted popcorn" }),
    })
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByLabel("Your name").fill("Cinema Tester");
  await page.getByLabel("Email address").fill("cinema@example.test");
  await page.getByLabel("Promo code").fill("FIRSTSHOW");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByLabel("Simulated result").selectOption("failure");
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "simulated payment failed",
  );
  await page.getByLabel("Simulated result").selectOption("success");
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(
    page.getByRole("heading", { name: "You’re going to the movies." }),
  ).toBeVisible();
  await expect(page.locator(".qr-code")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ticket" }).click();
  expect((await download).suggestedFilename()).toMatch(/MovieVerse.*\.png/);
  await page.goto("/my-tickets");
  await expect(page.locator(".digital-ticket")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel demo booking" }).click();
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelled", exact: true }).click();
  await expect(page.locator(".digital-ticket.cancelled")).toHaveCount(1);
});

test("city switching and cinema-first booking preserve venue and layout", async ({
  page,
}) => {
  await page.goto("/cinemas");
  await expect(
    page.getByRole("heading", { name: "Cinemas in Chennai." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chennai", exact: true }).click();
  await page.getByPlaceholder("Search for your city").fill("Mumbai");
  await page.getByRole("button", { name: "Mumbai", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cinemas in Mumbai." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Palazzo", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Metro Cinema", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Metro Cinema", exact: true }),
  ).toBeVisible();
  await page.locator(".time-slot").first().click();
  await expect(
    page.getByRole("button", { name: "Best 2 seats" }),
  ).toBeEnabled();
  await expect(page.locator(".layout-note")).toContainText("The Grand");
  await page.getByRole("button", { name: "Mumbai", exact: true }).click();
  await page.getByPlaceholder("Search for your city").fill("Nagpur");
  await page.getByRole("button", { name: "Nagpur", exact: true }).click();
  await expect(page).toHaveURL(/\/movies$/);
  await expect(
    page.getByRole("heading", { name: "Now showing in Nagpur." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Nagpur", exact: true }),
  ).toBeVisible();
});

test("server holds are atomic across sessions and checkout is idempotent", async ({
  playwright,
  baseURL,
}) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  await a.get("/api/session");
  await b.get("/api/session");
  const venue = venues.find((v) => v.cityId === "pune")!;
  const show = showsFor(venue, "sintel", dates()[6])[2];
  const inv = await (
    await a.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)
  ).json();
  const group = recommendSeats(inv.seats, inv.inventory, 2, inv.blueprint).map(
    (s) => s.id,
  );
  expect(group).toHaveLength(2);
  const results = await Promise.all([
    a.post("/api/hold", { data: { showId: show.id, seats: group } }),
    b.post("/api/hold", { data: { showId: show.id, seats: group } }),
  ]);
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const winner = results[0].ok() ? a : b;
  const requestId = crypto.randomUUID();
  const input = {
    showId: show.id,
    seats: group,
    cart: {},
    requestId,
    outcome: "success",
  };
  const [first, second] = await Promise.all([
    winner.post("/api/checkout", { data: input }),
    winner.post("/api/checkout", { data: input }),
  ]);
  expect(first.ok()).toBe(true);
  expect(second.ok()).toBe(true);
  expect(await second.json()).toEqual(await first.json());
  const loser = winner === a ? b : a;
  expect((await loser.get("/api/tickets")).ok()).toBe(true);
  expect(
    (await (await loser.get("/api/tickets")).json()).bookings,
  ).toHaveLength(0);
  const book = (await (await winner.get("/api/tickets")).json()).bookings[0];
  await winner.post("/api/cancel-booking", { data: { id: book.id } });
  const after = await (
    await loser.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)
  ).json();
  group.forEach((id) => expect(after.inventory[id].status).toBe("available"));
  await a.dispose();
  await b.dispose();
});

test("mobile discovery, city search, accessible map and account session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "MOVIEVERSE", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/register");
  const email = `tester-${crypto.randomUUID().slice(0, 8)}@example.test`;
  await page.getByLabel("Your name").fill("Mobile Tester");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Strong-demo-pass-27");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Mobile." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Strong-demo-pass-27");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Mobile." }),
  ).toBeVisible();
});

test("3D sample film playback, camera presets, seat perspective and 2D alternative", async ({
  page,
}) => {
  await page.goto("/movies/sintel");
  await expect(
    page.getByRole("heading", { name: "Sintel", exact: true }),
  ).toBeVisible();
  await page.locator(".time-slot").first().click();
  await expect(
    page.getByRole("button", { name: "Best 2 seats" }),
  ).toBeEnabled();
  await expect(page.locator(".scene-hints")).toContainText(
    "video playing on screen",
    { timeout: 30000 },
  );
  await expect(page.locator("canvas")).toHaveCount(1);
  const overview = await page
    .locator("canvas")
    .getAttribute("data-camera-position");
  await page.getByRole("button", { name: "From stage", exact: true }).click();
  await expect
    .poll(() => page.locator("canvas").getAttribute("data-camera-position"), {
      timeout: 10000,
    })
    .not.toBe(overview);
  await page.getByRole("button", { name: "Pause film" }).click();
  await expect(page.locator(".scene-hints")).toContainText("paused");
  await page.getByRole("button", { name: "Play film" }).click();
  await expect(page.locator(".scene-hints")).toContainText("video playing");
  await page.getByRole("button", { name: "Best 2 seats" }).click();
  await page.getByRole("button", { name: "My view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "My view", exact: true }),
  ).toHaveClass("selected");
  await page.getByRole("button", { name: "2D map", exact: true }).click();
  await expect(page.locator(".map-seat.picked")).toHaveCount(2);
});

test("admin previews distinct blueprints and protects publishing without a token", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "MovieVerse Demo Studio." }),
  ).toBeVisible();
  await page.getByLabel("Start with a layout").selectOption("luxury");
  await expect(page.locator(".blueprint-stats")).toContainText("84");
  await page.getByLabel("Rows", { exact: true }).fill("6");
  await expect(page.locator(".blueprint-stats")).toContainText("72");
  await page.getByRole("button", { name: "Movies", exact: true }).click();
  await expect(page.getByLabel("Movies record JSON")).toBeVisible();
  const denied = await request.post("/api/blueprint", { data: {} });
  expect(denied.status()).toBe(403);
});

test("reference lobby lighting, dragging and poster-wall discovery", async ({
  page,
}) => {
  await page.goto("/");
  const lobby = page.getByRole("region", {
    name: "Interactive movie panorama",
  });
  await expect(lobby).toHaveAttribute("data-featured-movie", "varanasi");
  const initialAccent = await lobby.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--lobby-accent"),
  );
  await page.getByRole("button", { name: "Next movie", exact: true }).click();
  await expect(lobby).toHaveAttribute("data-featured-movie", "toxic");
  expect(
    await lobby.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--lobby-accent"),
    ),
  ).not.toBe(initialAccent);
  const panorama = await page.locator(".panorama").boundingBox();
  await page.mouse.move(panorama!.x + panorama!.width / 2, panorama!.y + 120);
  await page.mouse.down();
  await page.mouse.move(
    panorama!.x + panorama!.width / 2 - 200,
    panorama!.y + 120,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(lobby).toHaveAttribute("data-featured-movie", "jailer-2");
  await page
    .getByRole("link", { name: "Find your next story", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Now showing in Chennai." }),
  ).toBeVisible();
});

test("sample-film hero controls and compact showtime comparisons", async ({
  page,
}) => {
  await page.goto("/movies/sintel");
  const preview = page.getByLabel("Sintel film preview");
  await expect(preview).toBeVisible();
  await expect
    .poll(() => preview.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThan(1);
  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect
    .poll(() => preview.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Play preview" }).click();
  await expect
    .poll(() => preview.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(false);
  await page.getByRole("button", { name: "Unmute preview" }).click();
  await expect
    .poll(() => preview.evaluate((el: HTMLVideoElement) => el.muted))
    .toBe(false);
  await page.getByRole("button", { name: "Mute preview" }).click();
  await page.getByLabel("Sort showtime cinemas").selectOption("Lowest price");
  await expect(page.locator(".showtime-row").first()).toContainText("Palazzo");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#showtimes").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
