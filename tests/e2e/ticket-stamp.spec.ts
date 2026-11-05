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


test("stamp follows full paper emergence and refresh does not replay it",async({page})=>{
 await prepareCheckout(page);
 await page.getByRole("button",{name:/Test payment$/}).click();
 const host=page.locator(".ticket-experience"), stamp=page.locator(".booking-stamp");
 await expect(host).toHaveAttribute("data-animation","preparing");
 await expect(stamp).toHaveCSS("opacity","0");
 await expect(stamp).toHaveCSS("visibility","hidden");
 await expect(host).toHaveAttribute("data-animation","printing");
 await expect(stamp).toHaveCSS("opacity","0");
 await expect(host).toHaveAttribute("data-animation","stamping");
 await expect(stamp).toHaveCSS("animation-name","ticket-stamp-impact");
 await expect(stamp).toHaveCSS("animation-duration","0.7s");
 const track=await page.locator(".ticket-output-track").boundingBox();
 const paper=await page.locator(".emerging-ticket").boundingBox();
 expect(Math.abs(track!.y-paper!.y)).toBeLessThan(1);
 await expect(host).toHaveAttribute("data-animation","completed");
 await expect(stamp).toHaveCSS("opacity","1");
 const completedHeight=await page.locator(".digital-ticket").evaluate(el=>el.clientHeight);
 await page.reload();
 await expect(host).toHaveAttribute("data-animation","completed");
 await expect(stamp).toHaveCSS("animation-name","none");
 await expect(stamp).toBeVisible();
 await page.getByRole("button",{name:"Replay animation"}).click();
 await expect(stamp).toHaveCSS("visibility","hidden");
 expect(await page.locator(".digital-ticket").evaluate(el=>el.clientHeight)).toBe(completedHeight);
 await expect(host).toHaveAttribute("data-animation","stamping");
 await expect(stamp).toHaveCSS("animation-name","ticket-stamp-impact");
 await expect(host).toHaveAttribute("data-animation","completed");
 const booking=await savedBooking(page);
 for(const status of ["pending","failed"]){
  await page.route("**/api/tickets",r=>r.fulfill({json:{bookings:[{...booking,status}]}}));
  await page.reload();await expect(page.locator(".digital-ticket")).toHaveAttribute("data-booking-status",status);
  await expect(stamp).toHaveCount(0);await page.unroute("**/api/tickets");
 }
 await page.request.post("/api/cancel-booking",{data:{id:booking.id}});
});
