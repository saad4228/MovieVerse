import { test, expect, type Page } from "@playwright/test";
import { dates, venues, showsFor } from "../../lib/catalog";
import { recommendSeats } from "../../lib/booking";
import type { BookingRecord } from "../../components/Account";

async function prepareCheckout(page: Page, day = 4) {
  await page.request.get("/api/session");
  const venue = venues.find(v => v.cityId === "pune")!;
  const show = showsFor(venue, "sintel", dates()[day])[1];
  const inventory = await (await page.request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
  const seats = recommendSeats(inventory.seats, inventory.inventory, 2, inventory.blueprint).map(s => s.id);
  expect(seats).toHaveLength(2);
  const hold = await page.request.post("/api/hold", { data: { showId: show.id, seats } });
  expect(hold.ok()).toBe(true);
  const { expires } = await hold.json();
  await page.goto("/my-tickets");
  await page.evaluate(({ showId, seats, expires }) => {
    localStorage.setItem("movieverse-v1", JSON.stringify({ state: { city: "pune", recentCities: [], showId, seats, cart: {}, holdExpires: expires }, version: 0 }));
  }, { showId: show.id, seats, expires });
  await page.goto(`/booking/${encodeURIComponent(show.id)}/checkout`);
  await page.getByLabel("Your name").fill("Ticket Experience Tester");
  await page.getByLabel("Email address").fill("ticket-experience@example.test");
  return { show, seats };
}

async function savedBooking(page: Page): Promise<BookingRecord> {
  const response = await page.request.get("/api/tickets");
  const { bookings } = await response.json();
  expect(bookings).toHaveLength(1);
  return bookings[0];
}


test("landscape confirmation fits all desktop viewports and preserves exports", async ({page}) => {
 const errors:string[]=[];page.on("pageerror", e=>errors.push(e.message));
 await prepareCheckout(page);
 await page.getByLabel("Simulated result").selectOption("success");
 await page.getByRole("button",{name:/Test payment$/}).click();
 await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation","completed");
 const booking=await savedBooking(page);
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,720]]) {
  await page.setViewportSize({width,height});
  await page.getByRole("button",{name:"Replay animation"}).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation","printing");

  for(const [stage,time] of [["begin",0],["middle",1400],["end",2800]] as const) {
   await page.locator(".ticket-experience").evaluate((el,time)=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time}),time);
   await page.screenshot({path:`outputs/compact-${width}-${stage}.png`});
   const track=await page.locator(".ticket-output-track").boundingBox();
   expect(track!.y+track!.height).toBeLessThanOrEqual(height);
  }
  // Screenshot capture may outlast the feed; finish only if it is still active.
  await page.locator(".ticket-skip").evaluateAll(buttons => (buttons[0] as HTMLButtonElement | undefined)?.click());
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation","completed");
  const ticket=page.locator(".digital-ticket");const box=await ticket.boundingBox();
  console.log(JSON.stringify({width,height,ticket:box}));
  expect(box!.width).toBeGreaterThan(780);expect(box!.height).toBeLessThanOrEqual(410);
  expect(box!.y+box!.height).toBeLessThanOrEqual(height);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await expect(ticket).toContainText(booking.id);
  await expect(page.locator(".qr-code")).toBeVisible();
  await page.screenshot({path:`outputs/compact-${width}-complete.png`});

 }
 await page.getByRole("button",{name:"Replay animation"}).click();
 const animationMetrics=await page.evaluate(()=>new Promise<{fps:number,p95:number}>(resolve=>{
  const times:number[]=[];const start=performance.now();let previous=start;
  function frame(now:number){times.push(now-previous);previous=now;if(now-start<3500)requestAnimationFrame(frame);else resolve({fps:1000/(times.reduce((a,b)=>a+b)/times.length),p95:times.sort((a,b)=>a-b)[Math.floor(times.length*.95)]});}requestAnimationFrame(frame);
 }));
 const fs=await import("node:fs/promises");await fs.writeFile("outputs/ticket-animation-performance.json",JSON.stringify(animationMetrics));
 console.log({ticketAnimation:animationMetrics});
 await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation","completed");
 const downloadEvent=page.waitForEvent("download");await page.getByRole("button",{name:"Download ticket"}).click();
 await (await downloadEvent).saveAs("outputs/cinematic-ticket-download.png");
 const {writeFile}=await import("node:fs/promises");
 await writeFile("outputs/cinematic-ticket-reference.json",JSON.stringify({id:booking.id,verification:`${new URL(page.url()).origin}/ticket/${booking.token}`}));
 await page.evaluate(()=>{window.print=()=>{document.body.dataset.printInvoked="true"}});
 await page.getByRole("button",{name:"Print ticket"}).click();await expect(page.locator("body")).toHaveAttribute("data-print-invoked","true");
 await page.emulateMedia({media:"print"});await page.pdf({path:"outputs/cinematic-ticket-print.pdf",preferCSSPageSize:true});
 expect(errors).toEqual([]);
});