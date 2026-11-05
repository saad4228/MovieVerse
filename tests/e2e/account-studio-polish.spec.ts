import { test, expect } from "@playwright/test";

test("ticket empty state stacks description and action cleanly across tabs and widths",async({page})=>{
  await page.route("**/api/tickets",route=>route.fulfill({json:{bookings:[]}}));
  for(const width of [1920,1440,1366,768,390]){
    await page.setViewportSize({width,height:width===390?844:900});
    await page.goto("/my-tickets");
    for(const tab of ["Upcoming","Past","Cancelled"]){
      await page.locator(".ticket-tabs").getByRole("button",{name:tab,exact:true}).click();
      const empty=page.locator(".tickets-empty");
      await expect(empty.getByRole("heading")).toHaveText("Your next movie moment is waiting.");
      const geometry=await empty.evaluate(el=>({description:el.querySelector("p")!.getBoundingClientRect().toJSON(),button:el.querySelector("a")!.getBoundingClientRect().toJSON(),lineHeight:parseFloat(getComputedStyle(el.querySelector("p")!).lineHeight)}));
      expect(geometry.button.top-geometry.description.bottom).toBeGreaterThanOrEqual(24);
      expect(geometry.lineHeight).toBeGreaterThanOrEqual(24);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.screenshot({path:`test-results/tickets-empty-${width}.png`});
  }
});

test("profile and studio share stable cinema artwork, transparent navigation and working actions",async({page})=>{
  await page.goto("/register");
  await page.getByLabel("Your name",{exact:true}).fill("Cinema Profile Tester");
  await page.getByLabel("Email address",{exact:true}).fill(`profile-${Date.now()}@example.test`);
  await page.getByLabel("Password",{exact:true}).fill("Cinema-Polish-2026");
  await page.getByRole("button",{name:"Create your account",exact:true}).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.locator(".profile-card h2")).toHaveText("Cinema Profile Tester");
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[768,1024],[390,844]]){
    await page.setViewportSize({width,height});
    const bg=page.locator(".amber-cinema-background");
    await expect(bg).toHaveCSS("background-size","cover");
    await expect(page.locator(".header")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
    await expect(bg).toHaveCSS("opacity","1");
    const before=await bg.boundingBox();
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    expect(await bg.boundingBox()).toEqual(before);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if(width===390) expect((await page.locator(".profile-identity").boundingBox())!.width).toBeGreaterThan(190);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`test-results/profile-${width}.png`,fullPage:width===390});
  }
  await page.locator(".account-links").getByRole("link",{name:/My tickets/}).click();
  await expect(page).toHaveURL(/\/my-tickets/);
  await expect(page.locator(".amber-cinema-background")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page.locator(".header")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
  await expect(page.locator(".amber-cinema-background")).toHaveCSS("background-image",/amber-cinema-interior/);
  await page.getByRole("button",{name:"Cities",exact:true}).click();
  await page.getByRole("button",{name:"Auditoriums",exact:true}).click();
  await expect(page.getByLabel("Auditorium name",{exact:true})).toBeVisible();
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[390,844]]){
    await page.setViewportSize({width,height});
    await page.screenshot({path:`test-results/studio-${width}.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.goto("/account");
  await page.getByRole("button",{name:"Sign out",exact:true}).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page.getByRole("heading",{name:"Your next chapter starts here."})).toBeVisible();
});
