import { test, expect, type Page } from "@playwright/test";

const asset = "/assets/movieverse-ticket-backdrop.webp";
const booking = {
  id: "background-verification", status: "confirmed", created: Date.now(), token: "background-test-token",
  seats: ["G8", "G9"], pricing: {total:720,tickets:640,food:0,fee:68,tax:12,discount:0}, cart: {},
  snapshot: {movie:{title:"Vikram",poster:"/assets/vikram.webp",certificate:"UA16+"},venue:{name:"Palazzo",address:"Chennai"},
    show:{date:"2027-01-03",time:"18:30",language:"Tamil",format:"IMAX"},auditorium:"The Grand - Screen 1"},
};

async function recordFrames(page: Page) {
  await page.addInitScript(() => {
    const samples: object[] = [];
    Object.assign(window, {ticketBackgroundFrames:samples});
    function sample() {
      const layer = document.querySelector(".tickets-background");
      if (layer) {
        const rect=layer.getBoundingClientRect(), style=getComputedStyle(layer);
        const main=document.querySelector(".tickets-page");
        samples.push({x:rect.x,y:rect.y,width:rect.width,height:rect.height,opacity:style.opacity,
          position:style.backgroundPosition,size:style.backgroundSize,image:style.backgroundImage,
          transform:style.transform,mainTransform:main ? getComputedStyle(main).transform : null});
      }
      if (samples.length < 2000) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}
async function checkStable(page: Page, width:number,height:number) {
  await expect(page.locator(".tickets-background")).toBeVisible();
  await expect(page.locator(".digital-ticket")).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => (window as any).ticketBackgroundFrames.length)).toBeGreaterThan(35);
  const samples = await page.evaluate(() => (window as any).ticketBackgroundFrames as any[]);
  expect(samples.some(s => s.mainTransform && s.mainTransform !== "none")).toBe(true);
  for(const s of samples) {
    expect({x:s.x,y:s.y,width:s.width,height:s.height}).toEqual({x:0,y:0,width,height});
    expect(s.opacity).toBe("1");expect(s.position).toBe("50% 50%");expect(s.size).toBe("cover");
    expect(s.image).toContain(asset);expect(s.transform).toBe("none");
  }
  const count=await page.evaluate(asset => performance.getEntriesByType("resource").filter(r=>new URL(r.name).pathname===asset).length,asset);
  expect(count).toBe(1);
  const layers=await page.locator(".tickets-background").count();expect(layers).toBe(1);
  expect(await page.locator(".tickets-page").evaluate(el=>getComputedStyle(el,"::before").content)).toBe("none");
}
for (const viewport of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844}]) {
  test(`stationary Tickets background from its first frame at ${viewport.width}px, normal and hard refresh`,async({page})=>{
    await page.setViewportSize(viewport);await recordFrames(page);
    await page.route("**/api/tickets",route=>route.fulfill({json:{bookings:[0,1,2].map(n=>({...booking,id:`${booking.id}-${n}`}))}}));
    await page.goto("/my-tickets");await checkStable(page,viewport.width,viewport.height);
    await page.screenshot({path:`outputs/tickets-background-${viewport.width}.png`});
    const client=await page.context().newCDPSession(page);await client.send("Network.enable");await client.send("Network.setCacheDisabled",{cacheDisabled:true});
    await client.send("Page.reload",{ignoreCache:true});await checkStable(page,viewport.width,viewport.height);
  });
  test(`cold slow load keeps final composition before ticket data at ${viewport.width}px`,async({page})=>{
    test.setTimeout(150000);await page.setViewportSize(viewport);await recordFrames(page);
    const client=await page.context().newCDPSession(page);await client.send("Network.enable");
    await client.send("Network.setCacheDisabled",{cacheDisabled:true});
    await client.send("Network.emulateNetworkConditions",{offline:false,latency:140,downloadThroughput:400*1024,uploadThroughput:200*1024});
    let releaseCatalog!:()=>void;const gate=new Promise<void>(resolve=>{releaseCatalog=resolve;});
    await page.route("**/api/catalog",async route=>{await gate;await route.continue();});
    await page.route("**/api/tickets",route=>route.fulfill({json:{bookings:[0,1,2].map(n=>({...booking,id:`${booking.id}-${n}`}))}}));
    await page.goto("/my-tickets",{waitUntil:"domcontentloaded"});
    await expect(page.locator(".tickets-background")).toBeVisible();
    await expect(page.locator(".tickets-page")).toHaveCount(0);
    await expect(page.locator('link[rel="preload"][as="image"][href="'+asset+'"]').first()).toHaveAttribute("fetchpriority","high");
    await expect.poll(() => page.evaluate(asset => performance.getEntriesByType("resource").some(entry=>new URL(entry.name).pathname===asset),asset), {timeout:30000}).toBe(true);
    // Freeze page entry at its formerly broken transform while recording the artwork.
    await page.evaluate(()=>{
      new MutationObserver((_,observer)=>{const main=document.querySelector(".tickets-page");if(!main)return;
        for(const animation of main.getAnimations()){animation.pause();animation.currentTime=60;}
        observer.disconnect();}).observe(document.body,{childList:true,subtree:true});
    });
    await page.locator(".tickets-background").screenshot({path:`outputs/tickets-background-cold-initial-${viewport.width}.png`,style:".tickets-route-shell > :not(.tickets-background) { visibility: hidden !important; }"});
    releaseCatalog();await expect(page.locator(".tickets-page")).toBeVisible({timeout:60000});
    await checkStable(page,viewport.width,viewport.height);
    await page.locator(".tickets-background").screenshot({path:`outputs/tickets-background-cold-mounted-${viewport.width}.png`,style:".tickets-route-shell > :not(.tickets-background) { visibility: hidden !important; }"});
    await page.locator(".tickets-page").evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));
    await page.locator(".tickets-background").screenshot({path:`outputs/tickets-background-cold-final-${viewport.width}.png`,style:".tickets-route-shell > :not(.tickets-background) { visibility: hidden !important; }"});
    const geometry=await page.locator(".tickets-background").boundingBox();expect(geometry).toEqual({x:0,y:0,...viewport});
  });
}
test("ticket artwork follows client navigation without leaking to other routes",async({page})=>{
  await page.goto("/movies");await expect(page.locator(".movie-grid")).toBeVisible();
  await page.locator(".header").getByRole("link",{name:"My tickets",exact:true}).click();
  await expect(page.locator(".tickets-background")).toBeVisible();
  await expect(page.locator(".tickets-page")).toBeVisible();
  await page.locator(".header").getByRole("link",{name:"Movies",exact:true}).click();
  await expect(page.locator(".movie-grid")).toBeVisible();await expect(page.locator(".tickets-background")).toHaveCount(0);
});
