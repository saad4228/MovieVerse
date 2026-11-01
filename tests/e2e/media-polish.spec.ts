import { test, expect } from "@playwright/test";

test("official film preview opens centrally and follows the selected movie", async ({
  page,
}) => {
  await page.goto("/movies/ramayana");
  await expect(page.locator(".movie-hero .youtube-player")).toHaveAttribute(
    "data-video-id",
    "AYkPRN874m8",
  );
  await page
    .getByRole("button", { name: "Trailer preview", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const viewport = page.viewportSize()!;
  await expect
    .poll(async () => {
      const bounds = await dialog.boundingBox();
      return Math.max(
        Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2),
        Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2),
      );
    })
    .toBeLessThan(3);
  await expect(dialog.locator(".youtube-player")).toHaveAttribute(
    "data-video-id",
    "AYkPRN874m8",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.goto("/movies/toxic");
  await expect(page.locator(".movie-hero .youtube-player")).toHaveAttribute(
    "data-video-id",
    "EfluEyQ5QIA",
  );
  await expect(page.locator(".detail-poster")).toHaveAttribute(
    "src",
    /posters\/toxic-1200/,
  );
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

test("booking screen uses the booked film trailer and remains aligned through camera views", async ({
  page,
}) => {
  await page.goto("/movies/jailer-2");
  await page.locator(".time-slot").first().click();
  const screen = page.getByLabel("Jailer 2 trailer on cinema screen");
  await expect(screen.locator(".youtube-player")).toHaveAttribute(
    "data-video-id",
    "FW_PPcr1sPE",
  );
  await expect
    .poll(() => screen.evaluate((el) => getComputedStyle(el).visibility))
    .toBe("visible");
  await expect
    .poll(() =>
      screen.evaluate((el) => el.style.transform.startsWith("matrix3d(")),
    )
    .toBe(true);
  await page.getByRole("button", { name: "From stage", exact: true }).click();
  await expect
    .poll(() => screen.evaluate((el) => getComputedStyle(el).visibility), {
      timeout: 30000,
    })
    .toBe("hidden");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect
    .poll(() => screen.evaluate((el) => getComputedStyle(el).visibility), {
      timeout: 30000,
    })
    .toBe("visible");
});
