import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

for (const provider of ["direct-mp4", "hls"]) {
  test(`${provider} theatre retains texture while buffering, replays and cleans up`, async ({ page }) => {
    test.setTimeout(150000);
    await page.addInitScript(() => {
      const create = document.createElement.bind(document);
      window.trackedCinemaVideos = [];
      document.createElement = ((tag: string, options?: ElementCreationOptions) => {
        const element = create(tag, options);
        if (tag === "video") window.trackedCinemaVideos.push(element as HTMLVideoElement);
        return element;
      }) as typeof document.createElement;
    });
    if (provider === "hls") {
      await page.route("**/assets/test-stream/*", async route => {
        const filename = new URL(route.request().url()).pathname.split("/").pop()!;
        await route.fulfill({ body: await readFile(path.join(process.cwd(), "tests/fixtures/hls", filename)), contentType: filename.endsWith("m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t" });
      });
      await page.route("**/api/catalog", async route => {
        const response = await route.fetch(), data = await response.json();
        data.movies.find((m: import("../../lib/catalog").Movie) => m.id === "sintel").trailers = [{ id: "licensed-fixture", provider, url: "/assets/test-stream/stream.m3u8", playbackAllowed: true, type: "sample", fit: "cover" }];
        await route.fulfill({ response, json: data });
      });
    }
    await page.goto("/movies/sintel");
    await page.locator(".time-slot").first().click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-video-status", "playing", { timeout: 60000 });
    const texture = await canvas.getAttribute("data-video-texture-id");
    expect(texture).toBeTruthy();
    await page.evaluate(() => {
      const video = window.trackedCinemaVideos.findLast((v: HTMLVideoElement) => v.getAttribute("src") && !v.isConnected)!;
      window.cinemaVideo = video;
      video.dispatchEvent(new Event("waiting"));
    });
    await expect(canvas).toHaveAttribute("data-video-status", "buffering");
    await expect(canvas).toHaveAttribute("data-video-texture-id", texture!);
    await expect(page.getByText("Buffering trailer", { exact: true })).toBeVisible();
    await page.evaluate(() => window.cinemaVideo.dispatchEvent(new Event("playing")));
    await expect(canvas).toHaveAttribute("data-video-status", "playing");
    await page.getByRole("button", { name: "Unmute film", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-video-muted", "false");
    await page.getByRole("button", { name: "Pause film", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-video-status", "paused");
    await expect(canvas).toHaveAttribute("data-video-texture-id", texture!);
    await page.evaluate(() => { const v = window.cinemaVideo; v.currentTime = v.duration - .1; });
    await page.getByRole("button", { name: "Play film", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-video-status", "ended");
    await page.getByRole("button", { name: "Replay trailer", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-video-status", "playing");
    await page.getByRole("button", { name: "Best 2 seats", exact: true }).click();
    await expect(page.locator(".selected-seats-list>div")).toHaveCount(2);
    const frame = JSON.parse((await canvas.getAttribute("data-screen-frame"))!);
    const surface = JSON.parse((await canvas.getAttribute("data-video-surface"))!);
    expect(surface.width).toBeLessThanOrEqual(frame.width);
    expect(surface.height).toBeLessThanOrEqual(frame.height);
    if (provider === "hls") { expect(surface.width).toBe(frame.width); expect(surface.height).toBe(frame.height); }
    await page.screenshot({ path: `outputs/playback-${provider}.png` });
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(await page.evaluate(() => { const v = window.cinemaVideo; return v.paused && !v.getAttribute("src"); })).toBe(true);
  });
}

test("YouTube readiness, buffering, ended and retry retain one official player", async ({ page }) => {
  await page.route("https://www.youtube.com/embed/**", route => route.fulfill({ contentType: "text/html", body: "<body style='margin:0;background:#16263a'>Official player fixture</body>" }));
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({ contentType: "application/javascript", body: `
    window.YT={Player:class {
      constructor(el,o){this.el=el;this.o=o;this.state=-1;this.plays=0;window.player=this;setTimeout(()=>o.events.onReady({target:this}),500)}
      playVideo(){this.plays++;this.emit(1)} pauseVideo(){this.emit(2)} mute(){} unMute(){}
      emit(state){this.state=state;this.o.events.onStateChange({target:this,data:state})}
      getCurrentTime(){return 2} getPlayerState(){return this.state} destroy(){this.el.remove()}
      fail(){this.o.events.onError({target:this,data:153})}
    }};window.onYouTubeIframeAPIReady();` }));
  await page.goto("/movies/jailer-2"); await page.locator(".time-slot").first().click();
  const canvas=page.locator("canvas"), iframe=page.locator(".cinema-embedded-player iframe");
  await expect(canvas).toHaveAttribute("data-video-status","playing");
  await expect(iframe).toHaveCount(1);
  const original=await iframe.elementHandle();
  const params=new URL((await iframe.getAttribute("src"))!).searchParams;
  expect(params.get("controls")).toBe("0");expect(params.has("modestbranding")).toBe(false);
  const plays=await page.evaluate(()=>window.player.plays);
  await page.getByRole("button",{name:"Unmute film",exact:true}).click();
  expect(await page.evaluate(()=>window.player.plays)).toBe(plays);
  await page.evaluate(()=>window.player.emit(3));
  await expect(canvas).toHaveAttribute("data-video-status","buffering");
  expect(await original!.evaluate(e=>e.isConnected)).toBe(true);
  await page.evaluate(()=>window.player.emit(0));
  await expect(page.getByRole("button",{name:"Replay trailer",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Replay trailer",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-video-status","playing");
  await page.evaluate(()=>window.player.fail());
  await expect(iframe).toHaveCount(0);
  await page.getByRole("button",{name:"Retry trailer",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-video-status","playing");
  await expect(iframe).toHaveCount(1);
  await page.getByRole("button",{name:"Fullscreen cinema",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await expect(iframe).toHaveCount(1);
  await page.evaluate(()=>document.exitFullscreen());
});
