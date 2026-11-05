import { test, expect, type Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/movies/jailer-2");
  await page.getByRole("button", { name: /TOMORROW/ }).click();
  await page.getByRole("button", { name: "10:30 Jailer 2 at Palazzo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Best 2 seats", exact: true })).toBeEnabled();
  await expect(page.locator("canvas")).toBeVisible();
}

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of [".booking-topbar", ".sidebar-checkout", ".view-top-controls", ".scene-control-buttons"]) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  }
  const content = await page.locator(".sidebar-content").evaluate(e => ({ scroll: e.scrollHeight, client: e.clientHeight }));
  expect(content.scroll).toBeLessThanOrEqual(content.client + 1);
}

for (const [width, height] of [[1920,1080], [1600,900], [1440,900], [1366,768], [1280,720]]) {
  test(`desktop seat workspace ${width}x${height} keeps checkout visible`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height });
    await enter(page);
    await fits(page);
    await expect(page.getByRole("button", { name: "Continue · Add snacks", exact: true })).toBeDisabled();
    const canvas = await page.locator("canvas").elementHandle();
    await page.getByRole("button", { name: "Best 2 seats", exact: true }).click();
    await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(2);
    const before = await page.locator("canvas").boundingBox();
    await page.getByRole("button", { name: "More seats", exact: true }).click();
    await page.getByRole("button", { name: "More seats", exact: true }).click();
    await page.getByRole("button", { name: "Best 4 seats", exact: true }).click();
    await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(4);
    await fits(page);
    expect(await canvas!.evaluate(e => e.isConnected)).toBe(true);
    expect(await page.locator("canvas").boundingBox()).toEqual(before);
    for (let i=0;i<4;i++) await page.getByRole("button", { name: "More seats", exact: true }).click();
    await page.getByRole("button", { name: "Best 8 seats", exact: true }).click();
    await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(8);
    await fits(page);
    const last = page.locator(".selected-seats-list>div:not(.seat-row-leaving)").last();
    await last.scrollIntoViewIfNeeded();
    await last.getByRole("button").click();
    await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(7);
    await page.getByRole("button", { name: "Undo selection", exact: true }).click();
    await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(8);
    await fits(page);
    await page.screenshot({ path: `outputs/seat-workspace-verified-${width}x${height}.png` });
  });
}

test("category controls, 2D selection and seat preview preserve the booking flow", async ({ page }) => {
  await page.setViewportSize({width:1366,height:768});
  await enter(page);
  for (const name of ["From stage", "Balcony", "Bird\u2019s eye", "Tour", "Overview"]) {
    await page.locator(".camera-presets").getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".viewpoint-label")).toHaveText(name);
  }
  const category = page.locator(".seat-class").filter({hasText:"Classic"});
  await category.click();
  await expect(page.getByLabel("Preferred seat class")).toHaveValue("classic");
  await expect(category).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
  await expect(page.locator(".selected-seats-list")).toContainText("Classic");
  await page.getByRole("button",{name:"View from this seat",exact:true}).click();
  await expect(page.locator(".seat-view-return")).toBeVisible();
  await page.getByRole("button",{name:/Exit preview/i}).click();
  await page.getByRole("button",{name:"2D map",exact:true}).click();
  await expect(page.locator(".map-seat.picked")).toHaveCount(2);
  await page.locator(".map-seat.picked").first().click();
  await expect(page.locator(".map-seat.picked")).toHaveCount(1);
  await page.getByRole("button",{name:"Continue · Add snacks",exact:true}).click();
  await expect(page).toHaveURL(/\/snacks$/);
  await page.getByRole("link",{name:"Skip snacks & continue"}).click();
  await expect(page.getByLabel("Your name")).toBeVisible();
});

for (const width of [768,390]) {
  test(`summary sheet preserves canvas and reachable checkout at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto("/movies/jailer-2");
    await page.getByRole("button",{name:/TOMORROW/}).click();
    await page.getByRole("button",{name:"10:30 Jailer 2 at Palazzo",exact:true}).click();
    await expect(page.locator("canvas")).toBeVisible();
    const canvas=await page.locator("canvas").elementHandle();
    const before=await page.locator("canvas").boundingBox();
    await page.getByRole("button",{name:/Seat options & summary/}).click();
    await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
    await expect(page.locator(".selected-seats-list>div")).toHaveCount(2);
    await expect(page.getByRole("button",{name:"Continue · Add snacks",exact:true})).toBeInViewport();
    expect(await canvas!.evaluate(e=>e.isConnected)).toBe(true);
    expect(await page.locator("canvas").boundingBox()).toEqual(before);
    await page.screenshot({path:`outputs/seat-workspace-sheet-${width}.png`});
    await page.getByRole("button",{name:"Return to theatre",exact:true}).click();
    await expect(page.locator(".sidebar-content")).toBeHidden();
    await expect(page.getByRole("button",{name:"Continue · Add snacks",exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  });
}
