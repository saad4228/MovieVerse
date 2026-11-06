import {test,expect} from "@playwright/test";
import {dates,venues,showsFor,snacks} from "../../lib/catalog";
import {recommendSeats,calculatePrice} from "../../lib/booking";

async function enter(page:import("@playwright/test").Page){
  await page.request.get("/api/session");
  const venue=venues.find(v=>v.cityId==="pune")!,show=showsFor(venue,"sintel",dates()[5])[0];
  const data=await (await page.request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
  const seats=recommendSeats(data.seats,data.inventory,2,data.blueprint);
  const hold=await page.request.post("/api/hold",{data:{showId:show.id,seats:seats.map(s=>s.id)}});
  expect(hold.ok()).toBe(true);const {expires}=await hold.json();
  await page.goto("/my-tickets");
  const cart={[snacks[0].id]:1};
  await page.evaluate(({show,seats,expires,cart})=>localStorage.setItem("movieverse-v1",JSON.stringify({state:{city:"pune",recentCities:[],showId:show.id,seats:seats.map((s: import("../../lib/catalog").Seat)=>s.id),cart,holdExpires:expires,promoCode:""},version:0})),{show,seats,expires,cart});
  await page.goto(`/booking/${encodeURIComponent(show.id)}/checkout`);
  await expect(page.locator(".premium-checkout")).toBeVisible();
  return {show,seats,cart};
}

test("coupons apply once, persist, remove, replace and agree with the confirmed server amount",async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const {show,seats,cart}=await enter(page);
  const full=calculatePrice(seats,show,cart),first=calculatePrice(seats,show,cart,"FIRSTSHOW");
  const total=page.locator(".summary-total strong");
  const amount=(value:number)=>new RegExp(String(value));
  await expect(total).toContainText(amount(full.total));
  await page.getByRole("button",{name:"Use FIRSTSHOW",exact:true}).click();
  await expect(page.getByRole("button",{name:"Remove coupon"})).toBeVisible();
  await expect(page.getByLabel("Promo code")).toBeDisabled();
  await expect(page.locator(".coupon-feedback")).toContainText("Coupon applied successfully!");
  await expect(page.locator(".coupon-sparkles i")).toHaveCount(6);
  await expect(total).toContainText(amount(first.total));
  await page.getByRole("button",{name:"Use FIRSTSHOW",exact:true}).click();
  await expect(total).toContainText(amount(first.total));
  await page.reload();
  await expect(page.getByLabel("Promo code")).toHaveValue("FIRSTSHOW");
  await expect(total).toContainText(amount(first.total));
  await page.getByRole("link",{name:"Edit snacks",exact:true}).click();
  await expect(page.locator(".summary-lines .discount-line")).toContainText("FIRSTSHOW");
  await page.getByRole("link",{name:"Continue to checkout",exact:true}).click();
  await expect(page.getByLabel("Promo code")).toHaveValue("FIRSTSHOW");
  await page.getByRole("button",{name:"Remove coupon"}).click();
  await expect(total).toContainText(amount(full.total));
  await expect(page.locator(".coupon-feedback")).toContainText("Coupon removed");
  await expect(page.getByLabel("Promo code")).toBeEnabled();
  await page.getByLabel("Promo code").fill("INVALID");await page.getByRole("button",{name:"Apply",exact:true}).click();
  await expect(page.locator(".coupon-feedback")).toContainText("isn't valid");
  await expect(total).toContainText(amount(full.total));
  await page.getByRole("button",{name:"Use FIRSTSHOW",exact:true}).click();
  await page.getByRole("button",{name:"Use SNACKTIME",exact:true}).click();
  const snack=calculatePrice(seats,show,cart,"SNACKTIME");
  await expect(total).toContainText(amount(snack.total));
  await expect(page.locator(".discount-line")).toHaveCount(1);
  let posts=0;page.on("request",request=>{if(request.url().endsWith("/api/checkout")&&request.method()==="POST")posts++;});
  await page.locator(".checkout-pay").click();
  await expect(page.getByLabel("Your name")).toHaveAttribute("aria-invalid","true");
  expect(posts).toBe(0);
  await page.getByLabel("Your name").fill("Checkout Tester");
  await page.getByLabel("Email address").fill("tester@example.test");
  for(const method of ["Card","Net banking","UPI"]){await page.getByRole("button",{name:method,exact:true}).click();await expect(page.getByRole("button",{name:method,exact:true})).toHaveAttribute("aria-pressed","true");}
  await page.screenshot({path:"outputs/premium-checkout-desktop.png",fullPage:true});
  await page.getByLabel("Simulated result").selectOption("failure");
  await page.locator(".checkout-pay").click();
  await expect(page.getByRole("alert")).toContainText("simulated payment failed");
  expect((await (await page.request.get("/api/tickets")).json()).bookings).toHaveLength(0);
  const held=await (await page.request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
  for(const seat of seats){expect(held.inventory[seat.id].status).toBe("held");expect(held.inventory[seat.id].mine).toBe(true);}
  await expect(page.getByLabel("Promo code")).toHaveValue("SNACKTIME");
  await page.getByLabel("Simulated result").selectOption("success");
  // Hold the real request briefly to inspect pending UI, then forward it unchanged.
  await page.route("**/api/checkout",async route=>{await new Promise(resolve=>setTimeout(resolve,350));await route.continue();});
  await page.locator(".checkout-pay").evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
  await expect(page.locator(".checkout-pay")).toBeDisabled();
  await expect(page.locator(".premium-checkout")).toHaveAttribute("aria-busy","true");
  await expect(page).toHaveURL(/\/booking\/confirmation\//);
  const bookings=(await (await page.request.get("/api/tickets")).json()).bookings;
  expect(bookings).toHaveLength(1);expect(bookings[0].pricing).toEqual(snack);expect(posts).toBe(2);
});

test("mobile checkout is readable, reduced motion hides coupon particles and coupon clears for a new show",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:"reduce"});
  await enter(page);
  await page.getByRole("button",{name:"Use FIRSTSHOW",exact:true}).click();
  await expect(page.locator(".coupon-sparkles")).toHaveCSS("display","none");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const method of ["UPI","Card","Net banking"]){await page.getByRole("button",{name:method,exact:true}).click();}
  await page.getByLabel("Your name").fill("Mobile Tester");await page.getByLabel("Email address").fill("invalid");
  await page.locator(".checkout-pay").click();await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid","true");
  await page.screenshot({path:"outputs/premium-checkout-mobile.png",fullPage:true});
  await page.goto("/movies/sintel");await page.getByRole("button",{name:/TOMORROW/}).click();
  await page.locator(".time-slot").first().click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("movieverse-v1")!).state.promoCode)).toBe("");
});

test("snack coupon eligibility, invalid server coupons and cancellation preserve the reservation",async({page})=>{
  const {show,seats}=await enter(page);
  await page.getByRole("button",{name:"Use SNACKTIME",exact:true}).click();
  await page.getByRole("link",{name:"Edit snacks",exact:true}).click();
  await page.getByRole("button",{name:`Remove one ${snacks[0].name}`,exact:true}).click();
  await page.getByRole("link",{name:"Skip snacks & continue",exact:true}).click();
  await expect(page.getByLabel("Promo code")).toHaveValue("");
  await expect(page.locator(".coupon-feedback")).toContainText("no longer meets its terms");
  for(const promo of ["INVALID","FIRSTSHOW,SNACKTIME","SNACKTIME"]){
    const response=await page.request.post("/api/checkout",{data:{showId:show.id,seats:seats.map(s=>s.id),cart:{},promo,requestId:crypto.randomUUID(),outcome:"success"}});
    expect(response.status()).toBe(400);
  }
  await page.getByLabel("Your name").fill("Cancel Tester");
  await page.getByLabel("Email address").fill("cancel@example.test");
  await page.getByLabel("Simulated result").selectOption("cancel");
  await page.locator(".checkout-pay").click();
  await expect(page.getByRole("alert")).toContainText("cancelled");
  const held=await (await page.request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
  for(const seat of seats)expect(held.inventory[seat.id].mine).toBe(true);
  expect((await (await page.request.get("/api/tickets")).json()).bookings).toHaveLength(0);
});
