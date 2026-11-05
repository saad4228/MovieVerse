import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function overrideSintel(page: Page, trailers: object[]) {
  await page.route("**/api/catalog", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const catalog = data.catalog || data;
    const movie = catalog.movies.find((m: { id: string }) => m.id === "sintel");
    movie.trailers = trailers;
    movie.youtubeId = "FW_PPcr1sPE";
    await route.fulfill({ response, json: data });
  });
}
const source = (id: string, url: string, provider = "direct-mp4") => ({
  id,
  url,
  provider,
  playbackAllowed: true,
  type: "sample",
  attribution: "Sintel · Blender Foundation · CC BY 3.0",
});

test("custom player decodes real 1080p, changes quality, and suspends behind a trailer dialog", async ({
  page,
}) => {
  await page.goto("/movies/sintel");
  const hero = page.locator(".mv-background video");
  await expect
    .poll(() => hero.evaluate((v: HTMLVideoElement) => v.videoHeight))
    .toBe(1080);
  await page.getByRole("button", { name: "Pause video", exact: true }).click();
  await expect
    .poll(() => hero.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Play video", exact: true }).click();
  await page.getByRole("button", { name: "Unmute video", exact: true }).click();
  await expect
    .poll(() => hero.evaluate((v: HTMLVideoElement) => v.muted))
    .toBe(false);
  await page.getByRole("button", { name: "Play trailer", exact: true }).click();
  await expect
    .poll(() => hero.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await dialog.getByLabel("Video quality").selectOption("sintel-720");
  await expect
    .poll(() =>
      dialog.locator("video").evaluate((v: HTMLVideoElement) => v.videoHeight),
    )
    .toBe(720);
  await dialog.getByLabel("Video position").fill("15");
  await expect
    .poll(() =>
      dialog.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThanOrEqual(15);
  await page.keyboard.press("Escape");
  await expect
    .poll(() => hero.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(false);
  await page.goto("/movies/toxic");
  await expect(page.locator("video[src]")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("a denied video tries an alternate once; total failure keeps artwork and official link", async ({
  page,
}) => {
  let failedRequests = 0;
  await page.route("**/assets/denied.mp4", async (route) => {
    failedRequests++;
    await route.fulfill({ status: 403, body: "Unavailable" });
  });
  await overrideSintel(page, [
    source("denied", "/assets/denied.mp4"),
    source("backup", "/assets/sintel-trailer-720.mp4"),
  ]);
  await page.goto("/movies/sintel");
  await expect(page.locator(".mv-background")).toHaveAttribute(
    "data-source-id",
    "backup",
  );
  await expect(page.locator(".mv-background")).toHaveAttribute(
    "data-status",
    "playing",
  );
  expect(failedRequests).toBe(1);
  await page.getByRole("button", { name: "Play trailer", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".mv-player")).toHaveAttribute(
    "data-source-id",
    "backup",
  );
  expect(failedRequests).toBe(1);
  await page.keyboard.press("Escape");
  await page.unroute("**/api/catalog");
  await overrideSintel(page, [source("denied", "/assets/denied.mp4")]);
  await page.reload();
  await expect(page.locator(".mv-background")).toHaveAttribute(
    "data-status",
    "poster",
  );
  await expect(page.locator(".mv-video-poster")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch official trailer" }),
  ).toBeVisible();
});

test("HLS decodes through the custom player and exposes adaptive quality", async ({
  page,
}) => {
  await page.route("**/assets/test-stream/*", async (route) => {
    const filename = new URL(route.request().url()).pathname.split("/").pop()!;
    await route.fulfill({
      body: await readFile(
        path.join(process.cwd(), "tests/fixtures/hls", filename),
      ),
      contentType: filename.endsWith("m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t",
    });
  });
  await overrideSintel(page, [
    source("hls-test", "/assets/test-stream/stream.m3u8", "hls"),
  ]);
  await page.goto("/movies/sintel");
  await expect(page.locator(".mv-background")).toHaveAttribute(
    "data-status",
    "playing",
    { timeout: 30000 },
  );
  await expect
    .poll(() =>
      page
        .locator(".mv-background video")
        .evaluate((v: HTMLVideoElement) => v.videoHeight),
    )
    .toBe(360);
  await page.getByRole("button", { name: "Play trailer", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Video quality"),
  ).toHaveValue("hls:-1");
  await page
    .getByRole("dialog")
    .getByLabel("Video quality")
    .selectOption("hls:0");
  await expect(page.getByRole("dialog").locator(".mv-player")).toHaveAttribute(
    "data-status",
    "playing",
  );
});

test("camera arrows, free view and seat preview retain selection and continuous physical playback", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/movies/sintel");
  await page.locator(".time-slot").first().click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-screen-media", "video-texture", {
    timeout: 60000,
  });
  await expect(canvas).toHaveAttribute("data-video-resolution", "1080");
  await expect(
    page.locator(".seat-experience iframe,.projected-cinema-screen"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Best 2 seats" }).click();
  const choices = await page.locator(".selected-seats-list").innerText();
  const time = Number(await canvas.getAttribute("data-video-time"));
  await page.getByRole("button", { name: "Next auditorium viewpoint" }).click();
  await expect(page.locator(".viewpoint-label")).toContainText("Front centre");
  await page
    .getByRole("button", { name: "Previous auditorium viewpoint" })
    .click();
  await expect(page.locator(".viewpoint-label")).toContainText("Front left");
  await page.getByRole("button", { name: "View from this seat", exact: true }).click();
  await expect(page.locator(".viewpoint-label")).toContainText("Your view");
  await page.getByLabel("Preview selected seat").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Exit Preview" }).click();
  const region = page.getByRole("region", { name: "Interactive auditorium" });
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".viewpoint-label")).toContainText("Front centre");
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.6,
    box!.y + box!.height * 0.55,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(page.locator(".viewpoint-label")).toHaveText("Free view");
  // Let input damping settle, then observe the actual scheduled inventory refresh.
  let lastPosition = "";
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const p = (await canvas.getAttribute("data-camera-position")) || "";
        stableSamples = p === lastPosition ? stableSamples + 1 : 0;
        lastPosition = p;
        return stableSamples >= 3;
      },
      { timeout: 45000, intervals: [2000] },
    )
    .toBe(true);
  const settledPosition = await canvas.getAttribute("data-camera-position");
  await page.waitForResponse(
    (r) => r.url().includes("/api/inventory?") && r.ok(),
    { timeout: 15000 },
  );
  await expect(page.locator(".viewpoint-label")).toHaveText("Free view");
  await expect(canvas).toHaveAttribute(
    "data-camera-position",
    settledPosition!,
  );
  await expect(page.locator(".selected-seats-list")).toHaveText(choices, {
    useInnerText: true,
  });
  await expect(canvas).toHaveAttribute("data-video-status", "playing");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-video-time")))
    .not.toBe(time);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Next auditorium viewpoint" }).click();
  await expect(page.locator(".viewpoint-label")).toContainText("Front right");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
