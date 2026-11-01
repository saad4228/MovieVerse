import { test, expect } from "@playwright/test";

test("official trailers use intentional artwork and links with a centred dialog", async ({
  page,
}) => {
  await page.goto("/movies/ramayana");
  await expect(page.locator(".movie-hero iframe")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Trailer preview", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Watch official trailer" }),
  ).toHaveAttribute("href", /AYkPRN874m8/);
  const size = page.viewportSize()!;
  await expect
    .poll(async () => {
      const b = await dialog.boundingBox();
      return Math.abs(b!.x + b!.width / 2 - size.width / 2);
    })
    .toBeLessThan(3);
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/movies/toxic");
  await page.getByRole("button", { name: "Trailer preview", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Watch official trailer" }),
  ).toHaveAttribute("href", /EfluEyQ5QIA/);
});

test("date changes animate and update every screening date", async ({
  page,
}) => {
  await page.goto("/movies/jailer-2");
  const first = page.locator(".time-slot").first();
  await first.waitFor();
  await page.locator(".date-button").nth(1).click();
  await expect(page.locator(".date-button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page
      .locator(".showtime-list")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("screenings-enter");
  const directory = page.getByRole("region", {
    name: "Chennai cinema directory",
  });
  await expect(directory).toContainText("not verified to screen this film");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#showtimes").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

test("carousel wraps smoothly and honours reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const lobby = page.getByRole("region", {
    name: "Interactive movie panorama",
  });
  await expect(lobby).toHaveAttribute("data-featured-movie", "varanasi");
  for (let i = 0; i < 8; i++)
    await page.getByRole("button", { name: "Next movie", exact: true }).click();
  await expect(lobby).toHaveAttribute("data-featured-movie", "toxic");
  await expect(page.locator(".panorama-screen.current")).toHaveCount(1);
  await expect(
    page.locator(".panorama-screen.current img.screen-poster"),
  ).toHaveAttribute("srcset", /600w.*1200w/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({ path: "outputs/hd-qa/mobile.png" });
});

test("commercial booking uses matching artwork without a screen-space video overlay", async ({
  page,
}) => {
  await page.goto("/movies/jailer-2");
  await page.locator(".time-slot").first().click();
  await expect(page.locator(".seat-experience iframe")).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-screen-media",
    "poster-texture",
    { timeout: 60000 },
  );
  await expect(page.locator(".screen-official-link")).toHaveAttribute(
    "href",
    /FW_PPcr1sPE/,
  );
  await page.getByRole("button", { name: "From stage", exact: true }).click();
  await expect(page.locator(".projected-cinema-screen")).toHaveCount(0);
});
