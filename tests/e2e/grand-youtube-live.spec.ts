import {test,expect} from "@playwright/test";
import {writeFile} from "node:fs/promises";

/** Explicit opt-in: this verifies a real external provider, not a fixture.
 * Cross-origin media is inspected by browser automation only; application code
 * never captures iframe content or converts it to a VideoTexture. */
test("live YouTube continues presenting frames during Grand auditorium camera motion",async({page})=>{
  test.skip(process.env.MOVIEVERSE_LIVE_YOUTUBE!=="1","Requires live YouTube access.");
  test.setTimeout(150000);
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/movies/jailer-2");
  await page.getByRole("button",{name:/TOMORROW/}).click();
  await page.getByRole("button",{name:"10:30 Jailer 2 at Palazzo",exact:true}).click();
  const canvas=page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-video-status","playing",{timeout:60000});
  const frame=page.frames().find(frame=>frame.url().startsWith("https://www.youtube.com/embed/"))!;
  expect(frame).toBeTruthy();
  await frame.waitForSelector("video");
  await frame.evaluate(()=>{
    const video=document.querySelector("video")!;
    window.movieverseProbe={video,frames:0};
    const tick=()=>{window.movieverseProbe.frames++;video.requestVideoFrameCallback(tick);};
    video.requestVideoFrameCallback(tick);
  });
  const sample=async()=>({
    player:await canvas.evaluate(el=>JSON.parse(el.dataset.mediaTelemetry!)),
    renderer:await canvas.evaluate(el=>JSON.parse(el.dataset.renderTelemetry!)),
    media:await frame.evaluate(()=>{const p=window.movieverseProbe,v=p.video as HTMLVideoElement;const q=v.getVideoPlaybackQuality();return {time:v.currentTime,frames:p.frames,ready:v.readyState,paused:v.paused,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,sameElement:document.querySelector("video")===v};}),
  });
  await expect.poll(()=>canvas.getAttribute("data-media-telemetry")).toBeTruthy();
  const samples=[await sample()];
  const bounds=(await canvas.boundingBox())!;
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();
  const started=Date.now();let i=0,captures=0;
  while(Date.now()-started<30000){
    await page.mouse.move(bounds.x+bounds.width*(.5+.07*Math.sin(i++)),bounds.y+bounds.height*(.5+.02*Math.cos(i)),{steps:3});
    await page.waitForTimeout(450);samples.push(await sample());
    if(Date.now()-started>(captures+1)*10000&&captures<2){await page.screenshot({path:`outputs/grand-youtube-motion-${++captures}.png`});}
  }
  await page.mouse.up();
  await writeFile("outputs/grand-live-youtube-motion.json",JSON.stringify(samples,null,2));
  const first=samples[0],last=samples.at(-1)!;
  expect(last.player.time-first.player.time).toBeGreaterThan(25);
  expect(last.media.frames-first.media.frames).toBeGreaterThan(100);
  for(const sample of samples){expect(sample.player.instance).toBe(first.player.instance);expect(sample.media.sameElement).toBe(true);expect(sample.media.paused).toBe(false);expect(sample.player.state).toBe(1);}
});
