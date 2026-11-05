import {test,expect} from "@playwright/test";
test("movie filters survive a detail visit and poster failure preserves the card",async({page})=>{
  await page.goto("/movies");
  const query=page.getByRole("textbox",{name:"Search movie titles"});await expect(query).toBeVisible();
  await query.fill("Jailer");await expect(page.locator(".movie-grid .movie-card")).toHaveCount(1);
  await page.locator(".movie-grid .movie-art").click();await expect(page).toHaveURL(/movies\/jailer/);
  await page.goBack();await expect(query).toHaveValue("Jailer");
  await expect(page.locator(".movie-grid .movie-card")).toHaveCount(1);
  const art=page.locator(".movie-grid .movie-art"), box=await art.boundingBox();
  await art.locator("img").evaluate(img=>img.dispatchEvent(new Event("error")));
  await expect(art.locator(".poster-fallback")).toBeVisible();
  expect((await art.boundingBox())!.height).toBeCloseTo(box!.height,2);
  await page.goto("/coming-soon");await expect(query).toHaveValue("");
  await page.screenshot({path:"outputs/browse-polish.png"});
});
test("movie list restores scroll when returning from a movie",async({page})=>{
  await page.goto("/movies");await expect(page.locator(".movie-card").first()).toBeVisible();
  const card=page.locator(".movie-grid .movie-art").nth(8);await card.scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>scrollY);await card.click();await expect(page).toHaveURL(/movies\/[^/?]+/);
  await page.goBack();await expect(page.locator(".movie-grid")).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(before,0);
});
