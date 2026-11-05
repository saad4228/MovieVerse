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



test("confirmation artwork fills the banner across source ratios",async({page})=>{
 await prepareCheckout(page);
 await page.getByRole("button",{name:/Test payment$/}).click();
 await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation","completed");
 const booking=await savedBooking(page);
 const catalog=await(await page.request.get("/api/catalog")).json();
 for(const id of ["jailer-2","prahaar-the-untold-story-of-ujjwal-nikam","tumbbad-2"]){
  const movie=catalog.movies.find((m:{id:string})=>m.id===id);
  // Presentation fixtures use actual catalogue artwork, not production booking mutations.
  await page.route("**/api/tickets",r=>r.fulfill({json:{bookings:[{...booking,seats:id === "jailer-2" ? ["A1"] : ["G10","G11","G12","G13","G14","G15","G16","G17"],snapshot:{...booking.snapshot,movie}}]}}));
  await page.reload();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:width===1280?720:844});
   const art=page.locator(".animation-ticket .ticket-artwork-main");
   await expect.poll(()=>art.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
   await expect(art).toHaveCSS("object-fit","cover");
   await expect(page.locator(".premium-ticket-hero h2")).toHaveText(movie.title);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`outputs/polish-${id}-${width}.png`});
   if(width===1280)console.log(await page.locator(".digital-ticket").boundingBox());
   if(width===1280)expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
   const buttons=page.locator(".premium-ticket-actions > .btn");
   const first=await buttons.nth(0).boundingBox(), second=await buttons.nth(1).boundingBox();
   expect(first!.height).toBe(second!.height);
   expect(Math.abs(first!.y-second!.y)).toBeLessThan(1);
   expect(first!.x+first!.width).toBeLessThanOrEqual(second!.x);
   expect(await page.locator(".digital-ticket").evaluate(el=>Array.from(el.querySelectorAll("dd,.premium-booking-id strong,.premium-ticket-hero h2,button.btn")).every(e=>e.scrollWidth<=e.clientWidth+1))).toBe(true);
   console.log({id,width,dimensions:await art.evaluate((el:HTMLImageElement)=>({source:[el.naturalWidth,el.naturalHeight],container:[el.clientWidth,el.clientHeight]}))});
   await page.locator(".digital-ticket").screenshot({path:`outputs/banner-${id}-${width}.png`});
  }
  await page.unroute("**/api/tickets");
 }
});
