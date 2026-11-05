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
  for (let i = 0; i < 13; i++)
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

test("commercial trailer follows the physical screen, preserves seats, and recovers from provider failure", async ({
  page,
}) => {
  test.setTimeout(120000);
  // Verify our integration deterministically; live provider playback is checked
  // separately because its availability and autoplay policy vary by browser.
  await page.route("https://www.youtube.com/embed/**", route => route.fulfill({contentType:"text/html",body:"<html><body style='margin:0;background:#102040;color:white'>Official player fixture</body></html>"}));
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({contentType:"application/javascript",body:`
    window.YT={Player:class {
      constructor(element, options){this.element=element;this.events=options.events;this.state=-1;this.started=Date.now();window.testYouTubePlayer=this;setTimeout(()=>this.events.onReady({target:this}),0)}
      playVideo(){this.state=1;this.events.onStateChange({target:this,data:1})}
      pauseVideo(){this.state=2;this.events.onStateChange({target:this,data:2})}
      mute(){} unMute(){} destroy(){this.element.remove()}
      getCurrentTime(){return (Date.now()-this.started)/1000}
      getPlayerState(){return this.state}
      fail(){this.events.onError({target:this,data:153})}
    }};window.onYouTubeIframeAPIReady();` }));
  await page.goto("/movies/jailer-2");
  await page.locator(".time-slot").first().click();
  const player = page.locator(".cinema-embedded-player iframe");
  await expect(player).toHaveAttribute("src", /youtube\.com\/embed\/FW_PPcr1sPE/, {timeout:60000});
  const firstPlayerParams = new URL((await player.getAttribute("src"))!).searchParams;
  expect(firstPlayerParams.get("controls")).toBe("0");
  expect(firstPlayerParams.get("cc_load_policy")).toBe("0");
  expect(firstPlayerParams.get("disablekb")).toBe("1");
  expect(firstPlayerParams.get("playsinline")).toBe("1");
  await expect(page.locator("canvas")).toHaveAttribute("data-video-status", "playing", {timeout:60000});
  await expect(page.locator("canvas")).toHaveAttribute("data-screen-media", "youtube-embedded");
  await page.getByRole("button", { name: "Best 2 seats" }).click();
  const selected = await page.locator(".selected-seats-list").innerText();
  const time = Number(await page.locator("canvas").getAttribute("data-video-time") || 0);
  const before = await player.boundingBox();
  await page.getByRole("button", { name: "Next auditorium viewpoint" }).click();
  await expect.poll(() => player.boundingBox(), {timeout:15000}).not.toEqual(before);
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving", "false", {timeout:15000});
  await expect(page.locator(".selected-seats-list")).toHaveText(selected, {useInnerText:true});
  await expect.poll(async()=>Number(await page.locator("canvas").getAttribute("data-video-time"))).toBeGreaterThan(time);
  await page.getByRole("button", {name:"Unmute film"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-video-muted", "false");
  await page.getByRole("button", {name:"Pause film"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-video-status", "paused");
  await page.getByRole("button", {name:"Play film"}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-video-status", "playing");
  await page.evaluate(() => (window as unknown as {testYouTubePlayer:{fail:()=>void}}).testYouTubePlayer.fail());
  await expect(player).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-screen-media",
    "poster-texture",
    { timeout: 60000 },
  );
  await expect(page.locator(".screen-official-link")).toHaveAttribute(
    "href",
    /FW_PPcr1sPE/,
  );
  await expect(page.locator(".selected-seats-list")).toHaveText(selected, {useInnerText:true});
});
