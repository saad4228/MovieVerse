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

async function seekPaper(page: Page, time: number) {
  await page.locator(".ticket-experience").evaluate((host, time) => {
    for (const animation of host.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = time;
    }
  }, time);
}

async function freezeClock(page: Page) {
  // Fix wall time before pausing: the target cannot slip into the past between
  // protocol calls. Timers were installed before navigation, not mid-animation.
  const fixedTime = new Date(await page.evaluate(() => Date.now()));
  await page.clock.setFixedTime(fixedTime);
  await page.clock.pauseAt(fixedTime);
}

test("real checkout prints the saved ticket; replay, refresh, download and print never book again", async ({ page }) => {
  // Observe short-lived phases in the frame they commit. Protocol polling can
  // legitimately miss READY (240ms), especially after a real checkout request.
  await page.addInitScript(() => {
    window.ticketPhases = {};
    new MutationObserver(() => {
      const host=document.querySelector<HTMLElement>(".ticket-experience");
      const phase=host?.dataset.animation;
      const header=document.querySelector(".header");
      if(!phase || !header || window.ticketPhases[phase])return;
      const style=getComputedStyle(header);
      window.ticketPhases[phase]={status:host?.querySelector(".printer-status-display strong")?.textContent||"",printerStatus:host?.querySelector<HTMLElement>(".ticket-dispenser")?.dataset.status||"",navbar:{
        backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage,backdropFilter:style.backdropFilter,borderBottomColor:style.borderBottomColor,
      }};
    }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:["data-animation"]});
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const { show, seats } = await prepareCheckout(page);
  let checkoutPosts = 0;
  page.on("request", request => { if (request.url().endsWith("/api/checkout") && request.method() === "POST") checkoutPosts++; });
  await page.getByLabel("Simulated result").selectOption("failure");
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(page.getByRole("alert")).toContainText("simulated payment failed");
  await expect(page.locator(".ticket-experience, .booking-stamp")).toHaveCount(0);
  expect((await (await page.request.get("/api/tickets")).json()).bookings).toHaveLength(0);
  const navbar = page.locator(".header");
  const glassNavbar = async () => navbar.evaluate(el => {
    const style = getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter,
      borderBottomColor: style.borderBottomColor,
    };
  });
  await expect(navbar).toBeVisible();
  // Checkout uses the approved theatre chrome; confirmation uses ticket glass.
  await expect(navbar).toHaveClass(/theatre-navbar/);
  await expect(navbar).toHaveCSS("border-bottom-color", "rgb(41, 42, 50)");
  await expect(navbar).toHaveCSS("background-image", "linear-gradient(110deg, rgb(20, 22, 29), rgb(17, 19, 26) 70%)");
  await page.getByLabel("Simulated result").selectOption("success");
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect.poll(() => page.evaluate(() => !!window.ticketPhases.ready)).toBe(true);
  await expect(navbar).toHaveClass(/glass-navbar/);
  const navbarBefore = await page.evaluate(() => window.ticketPhases.ready.navbar);
  expect(navbarBefore).toEqual({
    backgroundColor: "rgba(17, 11, 23, 0.86)",
    backgroundImage: "none",
    backdropFilter: "blur(18px)",
    borderBottomColor: "rgba(190, 130, 95, 0.16)",
  });

  expect(await glassNavbar()).toEqual(navbarBefore);
  await expect(page.getByRole("button", { name: "Skip animation" })).toHaveCSS("top", "102px");
  await expect(navbar).toHaveCSS("z-index", "30");
  await expect(page.locator(".tickets-page")).toHaveCSS("z-index", "20");
  expect(await page.evaluate(() => window.ticketPhases.ready.status)).toBe("READY");
  await expect.poll(() => page.evaluate(() => !!window.ticketPhases.preparing)).toBe(true);
  await expect(page.getByRole("button", { name: "Skip animation" })).toBeFocused();
  const printer = page.locator(".ticket-dispenser");
  expect(await page.evaluate(() => window.ticketPhases.preparing.printerStatus)).toBe("preparing");
  expect(await page.evaluate(() => window.ticketPhases.preparing.status)).toBe("PREPARING");
  expect(await page.evaluate(() => Object.keys(window.ticketPhases).slice(0,2))).toEqual(["ready","preparing"]);
  const machineBox = await printer.boundingBox();
  const initialTrackBox = await page.locator(".ticket-output-track").boundingBox();
  expect(Math.abs(initialTrackBox!.y - machineBox!.y - machineBox!.height)).toBeLessThanOrEqual(1);
  await expect(page.locator(".ticket-output-track")).toHaveCSS("clip-path", "none");
  const sceneImage = "/assets/movieverse-ticket-backdrop.webp";
  const sceneDuringPrint = await page.locator(".ticket-experience").evaluate(el => {
    const style = getComputedStyle(el);
    return { image: style.backgroundImage, size: style.backgroundSize, position: style.backgroundPosition };
  });
  const sceneBehindPage = await page.locator(".tickets-background").evaluate(el => {
    const style = getComputedStyle(el);
    return { image: style.backgroundImage, size: style.backgroundSize, position: style.backgroundPosition };
  });
  expect(sceneDuringPrint).toEqual(sceneBehindPage);
  expect(sceneDuringPrint.image).toContain(sceneImage);
  const ticket = page.locator(".digital-ticket");
  await expect(ticket).toContainText("YOUR UNIVERSE. YOUR MOVIE. YOUR SEAT.");
  await expect(ticket).toContainText("Scan at Entry");
  await expect(ticket).toContainText(seats.join(", "));
  await expect.poll(() => page.locator(".qr-code").evaluate(img => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  })).toBe(true);
  await expect.poll(() => page.locator(".ticket-artwork-main").evaluate(img => {
    const image = img as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  })).toBe(true);
  await expect(page.locator(".ticket-reveal-header")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "printing");
  expect(await glassNavbar()).toEqual(navbarBefore);
  await expect(navbar).toHaveCSS("z-index", "30");
  await page.screenshot({ path: "outputs/navbar-ticket-printing.png" });
  await expect(printer.locator(".printer-status-display strong")).toHaveText("PRINTING");
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  expect(await glassNavbar()).toEqual(navbarBefore);
  await expect(printer.locator(".printer-status-display strong")).toHaveText("BOOKING CONFIRMED");
  await expect.poll(async () => {
    const machine = await printer.boundingBox();
    const paper = await page.locator(".ticket-output-track").boundingBox();
    return Math.round(paper!.y - machine!.y - machine!.height);
  }).toBe(0);
  await page.screenshot({ path: "outputs/cinematic-printer-final.png", fullPage: true });
  await expect.poll(() => page.locator(".tickets-background").evaluate(el => getComputedStyle(el).backgroundImage)).toContain(sceneImage);
  const booking = await savedBooking(page);
  expect(booking.seats).toEqual(seats);
  expect(booking.snapshot.show).toMatchObject({ date: show.date, time: show.time, format: show.format, language: show.language });
  await expect(ticket).toContainText(booking.id);
  await expect(ticket).toContainText(booking.snapshot.venue.name);
  await expect(ticket).toContainText(booking.snapshot.auditorium);
  await expect(ticket).toContainText(booking.pricing.total.toLocaleString("en-IN"));
  await expect(page.locator(".booking-stamp")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ticket" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`MovieVerse-${booking.id}.png`);
  await download.saveAs("outputs/cinematic-ticket-download.png");
  // Keep the expected reference beside the PNG for independent QR decoding.
  const { writeFile } = await import("node:fs/promises");
  await writeFile("outputs/cinematic-ticket-reference.json", JSON.stringify({ id: booking.id, verification: `${new URL(page.url()).origin}/ticket/${booking.token}` }));

  await page.evaluate(() => { window.print = () => { document.body.dataset.printInvoked = "true"; }; });
  await page.getByRole("button", { name: "Print ticket" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-print-invoked", "true");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#ticket-print-sheet .digital-ticket")).toBeVisible();
  await expect(page.locator("#main-content")).toBeHidden();
  await expect(page.locator("#ticket-print-sheet button")).toHaveCount(0);
  const printedQr = page.locator("#ticket-print-sheet .qr-code");
  await expect(printedQr).toBeVisible();
  expect(await printedQr.evaluate(image=>{
    const qr=image as HTMLImageElement;
    return qr.complete && qr.naturalWidth >= 960 && qr.width >= 150;
  })).toBe(true);
  await expect(page.locator("#ticket-print-sheet .digital-ticket")).toContainText(booking.id);
  await page.pdf({ path: "outputs/cinematic-ticket-print.pdf", preferCSSPageSize: true });
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("#ticket-print-sheet")).toHaveCount(0);

  // Geometry stays reserved while the complete sheet travels through the slot.
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "printing");
  const track = await page.locator(".ticket-output-track").boundingBox();
  await seekPaper(page, 1200);
  const feeding = await page.locator(".emerging-ticket").boundingBox();
  expect(feeding!.y).toBeLessThan(track!.y);
  await expect(page.locator(".ticket-output-track")).toHaveCSS("overflow", "hidden");
  await page.screenshot({ path: "outputs/cinematic-ticket-feeding.png" });
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  await expect(page.getByRole("button", { name: "Replay animation" })).toBeFocused();
  await ticket.screenshot({ path: "outputs/cinematic-ticket-desktop.png" });
  await page.reload();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  expect((await savedBooking(page)).id).toBe(booking.id);
  expect(checkoutPosts).toBe(2); // one failed attempt and one successful attempt
  await page.getByRole("link", { name: "View booking", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/my-tickets/${booking.id}$`));
  await expect(page.locator(".digital-ticket")).toContainText(booking.id);
  await page.request.post("/api/cancel-booking", { data: { id: booking.id } });
  expect(errors).toEqual([]);
});

test("mobile ticket stays inside the slot and viewport; Escape and motion changes finish safely", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.ticketMobilePhases = [];
    let previous = "";
    new MutationObserver(() => {
      const phase = document.querySelector<HTMLElement>(".ticket-experience")?.dataset.animation;
      if (phase && phase !== previous) {
        window.ticketMobilePhases.push(phase);
        previous = phase;
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-animation"] });
  });
  await prepareCheckout(page, 5);
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect.poll(() => page.evaluate(() => {
    const phases = window.ticketMobilePhases;
    const ready = phases.lastIndexOf("ready");
    return ready >= 0 && phases.slice(ready).includes("completed");
  }), { timeout: 15000 }).toBe(true);
  const initialPhases = await page.evaluate(() => window.ticketMobilePhases.slice(window.ticketMobilePhases.lastIndexOf("ready")));
  expect(initialPhases.slice(0, 5)).toEqual(["ready", "preparing", "printing", "stamping", "completed"]);
  await expect.poll(() => page.locator(".tickets-background").evaluate(el => getComputedStyle(el).backgroundImage)).toContain("/assets/movieverse-ticket-backdrop.webp");
  await expect(page.locator(".qr-code")).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const qr = await page.locator(".qr-code").boundingBox();
    expect(qr!.width).toBeGreaterThanOrEqual(160);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".digital-ticket").screenshot({ path: "outputs/cinematic-ticket-mobile.png" });
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "printing");
  await freezeClock(page);
  const mobileScene = await page.locator(".tickets-page").evaluate(el => {
    const pageStyle = getComputedStyle(document.querySelector(".tickets-background")!);
    const animationStyle = getComputedStyle(el.querySelector(".ticket-experience")!);
    const read = (style: CSSStyleDeclaration) => ({ image: style.backgroundImage, size: style.backgroundSize, position: style.backgroundPosition });
    return { page: read(pageStyle), animation: read(animationStyle) };
  });
  expect(mobileScene.animation).toEqual(mobileScene.page);
  expect(mobileScene.page.image).toContain("/assets/movieverse-ticket-backdrop.webp");
  await expect(page.locator(".header")).toHaveCSS("background-color", "rgba(17, 11, 23, 0.86)");
  await expect(page.locator(".header")).toHaveCSS("z-index", "30");
  await expect(page.locator(".tickets-page")).toHaveCSS("z-index", "20");
  await expect(page.getByRole("button", { name: "Skip animation" })).toHaveCSS("top", "88px");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Skip animation" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  await expect(page.getByRole("button", { name: "Replay animation" })).toBeFocused();
  await page.clock.resume();
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "printing");
  await freezeClock(page);
  await seekPaper(page, 2900);
  expect(await page.locator(".ticket-experience").evaluate(el => el.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/cinematic-printer-mobile.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  expect(await page.locator("body").evaluate(el => el.style.overflow)).not.toBe("hidden");
  await expect(page.locator("[inert]")).toHaveCount(0);
  await page.clock.resume();
  const booking = await savedBooking(page);
  await page.request.post("/api/cancel-booking", { data: { id: booking.id } });
});

test("reduced motion immediately presents an actual newly booked ticket", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareCheckout(page, 6);
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  await expect(page.locator(".ticket-dispenser")).toHaveCount(1);
  await expect(page.locator(".printer-status-display strong")).toHaveText("BOOKING CONFIRMED");
  await expect(page.locator(".booking-stamp")).toBeVisible();
  await page.getByRole("button", { name: "Replay animation" }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  const booking = await savedBooking(page);
  await page.request.post("/api/cancel-booking", { data: { id: booking.id } });
});

test("pending, failed and cancelled records never claim success", async ({ page }) => {
  // Obtain a real snapshot, then simulate statuses not currently emitted by the demo provider.
  await prepareCheckout(page);
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  const booking = await savedBooking(page);
  for (const status of ["pending", "failed", "cancelled"]) {
    await page.route("**/api/tickets", route => route.fulfill({ json: { bookings: [{ ...booking, status }] } }));
    await page.reload();
    await expect(page.locator(".digital-ticket")).toHaveAttribute("data-booking-status", status);
    await expect(page.locator(".confirmation-heading, .ticket-dispenser, .booking-stamp, .qr-code")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download ticket" })).toHaveCount(0);
    await expect(page.locator(".ticket-status")).toContainText(status === "pending" ? "AWAITING CONFIRMATION" : status === "failed" ? "BOOKING FAILED" : "CANCELLED");
    await page.unroute("**/api/tickets");
  }
  await page.request.post("/api/cancel-booking", { data: { id: booking.id } });
});

test("loading, missing records and API errors never claim success; retry retrieves the saved booking", async ({ page }) => {
  await prepareCheckout(page);
  await page.getByRole("button", { name: /Test payment$/ }).click();
  await expect(page.locator(".ticket-experience")).toHaveAttribute("data-animation", "completed");
  const booking = await savedBooking(page);
  await page.route("**/api/tickets", route => route.fulfill({ json: { bookings: [] } }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ticket not found" })).toBeVisible();
  await expect(page.locator(".confirmation-heading")).toHaveCount(0);
  await page.unroute("**/api/tickets");
  await page.route("**/api/tickets", async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({ status: 503, json: { error: "Ticket service unavailable" } });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Checking your booking…" })).toBeVisible();
  await expect(page.locator(".confirmation-heading")).toHaveCount(0);
  await expect(page.getByText("Ticket service unavailable", { exact: false })).toBeVisible();
  await page.unroute("**/api/tickets");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".digital-ticket")).toHaveAttribute("data-booking-status", "confirmed");
  await page.request.post("/api/cancel-booking", { data: { id: booking.id } });
});
