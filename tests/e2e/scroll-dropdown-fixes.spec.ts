import {test,expect} from "@playwright/test";

test("vertical wheel over Now Showing posters scrolls the page while horizontal rail controls still work",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/");
  await expect(page.locator(".movieverse-home")).toBeVisible();
  await expect(page.locator(".moonlit-lobby .slide-counter")).toHaveCount(0);
  const rail=page.locator(".home-showing .movie-carousel");
  await rail.scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  const card=rail.locator(".movie-art").nth(1),box=(await card.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const before=await page.evaluate(()=>scrollY);
  await page.mouse.wheel(0,400);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+250);
  expect(await rail.evaluate(el=>el.scrollTop)).toBe(0);
  await rail.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const bounds=(await rail.boundingBox())!;
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.wheel(350,0);
  await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(200);
  const horizontal=await rail.evaluate(el=>el.scrollLeft);
  await page.locator(".home-showing .rail-controls button").last().click();
  await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(horizontal);
  await page.screenshot({path:"outputs/home-rail-scroll-fixed.png"});
});

test("Coming Soon native release-market and sort menus have readable dark options and still change values",async({page})=>{
  await page.goto("/coming-soon");
  const market=page.getByLabel("Release market",{exact:true});
  const sort=page.locator(".discovery-toolbar .sort-label").filter({hasText:"Sort by"}).locator("select");
  await expect(market).toBeVisible();
  for(const select of [market,sort]){
    await expect(select).toHaveCSS("color-scheme","dark");
    for(const option of await select.locator("option").all()){
      await expect(option).toHaveCSS("background-color","rgb(23, 24, 31)");
      await expect(option).toHaveCSS("color","rgb(242, 241, 245)");
    }
  }
  await market.click();await page.screenshot({path:"outputs/coming-soon-market-menu.png"});await page.keyboard.press("Escape");
  await market.selectOption("US");await expect(market).toHaveValue("US");
  await market.selectOption("IN");
  await sort.click();await page.screenshot({path:"outputs/coming-soon-sort-menu.png"});await page.keyboard.press("Escape");
  await sort.selectOption({label:"Top rated"});await expect(sort).toHaveValue("Top rated");
  await page.setViewportSize({width:390,height:844});
  await expect(market).toBeVisible();await expect(sort).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
