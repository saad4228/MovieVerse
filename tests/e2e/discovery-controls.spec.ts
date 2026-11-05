import { test, expect } from "@playwright/test";

test("auditorium gesture handoff, seat targets and responsive input retain physical playback", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/movies/sintel");
  await page.locator(".time-slot").first().click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-video-status", "playing", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-movie-id", "sintel");
  await expect(canvas).toHaveAttribute("data-video-muted", "true");
  await expect(canvas).toHaveAttribute("data-video-resolution", "1080");
  const frame = await canvas.getAttribute("data-screen-frame");
  const texture = await canvas.getAttribute("data-video-texture-id");
  await page.getByRole("button", { name: "Unmute film" }).click();
  await expect(canvas).toHaveAttribute("data-video-muted", "false");
  await page.getByRole("button", { name: "Best 2 seats" }).click();
  const selected = await page.locator(".selected-seats-list").innerText();
  const time = Number(await canvas.getAttribute("data-video-time"));
  const targets = new Set<string>();
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Next auditorium viewpoint" }).click();
    await expect(canvas).toHaveAttribute("data-camera-moving", "false", { timeout: 15000 });
    const target = (await canvas.getAttribute("data-camera-target"))!;
    targets.add(target);
    expect(Number(target.split(",")[2])).toBeGreaterThan(JSON.parse(frame!).z + 4);
  }
  expect(targets.size).toBeGreaterThan(2);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const box = (await canvas.boundingBox())!;
  // Starting manual input must cancel an in-flight preset transition.
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .64, box.y + box.height * .5, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".viewpoint-label")).toHaveText("Free view");
  await expect(canvas).toHaveAttribute("data-camera-moving", "false");
  const before = await canvas.getAttribute("data-camera-position");
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .48);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .35, box.y + box.height * .38, { steps: 3 });
  await page.mouse.up();
  await expect.poll(() => canvas.getAttribute("data-camera-position")).not.toBe(before);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width * .43, box.y + box.height * .43, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await page.mouse.wheel(0, -180);
  await expect(canvas).toHaveAttribute("data-screen-frame", frame!);
  await expect(canvas).toHaveAttribute("data-video-texture-id", texture!);
  await expect(canvas).toHaveAttribute("data-video-status", "playing");
  await expect(page.locator(".selected-seats-list")).toHaveText(selected, { useInnerText: true });
  await expect.poll(async () => Number(await canvas.getAttribute("data-video-time"))).toBeGreaterThan(time);
});

test("blocked autoplay keeps screen artwork and recovers through a single start gesture", async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    (window as any).__blockPlayback = true;
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return (window as any).__blockPlayback ? Promise.reject(new DOMException("Test browser policy", "NotAllowedError")) : original.call(this);
    };
  });
  await page.goto("/movies/sintel");
  await page.locator(".time-slot").first().click();
  const start = page.getByRole("button", { name: "Tap to start movie", exact: true });
  await expect(start).toBeVisible({ timeout: 60000 });
  await expect(page.locator("canvas")).toHaveAttribute("data-screen-media", "poster-texture");
  await page.evaluate(() => { (window as any).__blockPlayback = false; });
  await start.click();
  await expect(page.locator("canvas")).toHaveAttribute("data-video-status", "playing");
  await expect(page.locator("canvas")).toHaveAttribute("data-screen-media", "video-texture");
});

test("city rails expose boundaries, preserve drag and open the chosen movie", async ({ page }) => {
  await page.setViewportSize({ width: 950, height: 800 });
  for (const city of ["Nagpur", "Mumbai"]) {
    await page.goto("/");
    await expect(page.locator(".header")).toHaveAttribute("data-interactive", "true");
    await page.getByRole("button", { name: /^(Chennai|Nagpur|Mumbai|Pune|Delhi|Bengaluru|Hyderabad|Kolkata|Ahmedabad|Jaipur)$/ }).click();
    await page.getByPlaceholder("Search for your city").fill(city);
    await page.getByRole("button", { name: new RegExp(`^${city}`) }).click();
    const region = page.getByRole("region", { name: `Now showing in ${city}`, exact: true });
    const rail = region.locator(".movie-carousel");
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByRole("button", { name: /^Previous/ })).toBeDisabled();
    await region.getByRole("button", { name: /^Next/ }).click();
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(150);
    await region.getByRole("button", { name: /^Previous/ }).click();
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeLessThan(2);
    const box = (await rail.boundingBox())!;
    await page.mouse.move(box.x + 600, box.y + 160);
    await page.mouse.down();
    await page.mouse.move(box.x + 240, box.y + 160, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(200);
    await expect(page).toHaveURL(/\/$/);
    const link = rail.locator(".movie-art").nth(2);
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL(new URL(href!,page.url()).href);
  }
});
