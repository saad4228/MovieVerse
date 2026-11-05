import {test,expect} from "@playwright/test";
test("closed navbar search does no speculative catalogue work and remains functional",async({page})=>{
 const queries:string[]=[];page.on("request",r=>{if(/\/api\/(discovery-home|catalogue-search)/.test(r.url()))queries.push(r.url());});
 await page.goto("/cinemas",{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:/Cinemas in/})).toBeVisible();
 expect(queries).toEqual([]);
 await page.getByRole("button",{name:"Search movies and cinemas"}).click();
 await page.getByLabel("Search movies, cinemas and cities").fill("Dark Knight");
 await expect(page.locator(".search-results")).toContainText("The Dark Knight");
 expect(queries.some(url=>url.includes("catalogue-search?q=Dark"))).toBe(true);
});
test("automatic carousel suspends while out of view and resumes without changing its controls",async({page})=>{
 await page.goto("/",{waitUntil:"domcontentloaded"});const carousel=page.locator(".cinematic-panorama");await expect(carousel).toBeVisible();
 await page.getByRole("button",{name:"Start automatic rotation"}).click();
 await expect(carousel).toHaveAttribute("data-autoplay","playing");
 await page.locator(".footer").scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 const position=await carousel.getAttribute("data-position");await page.waitForTimeout(700);expect(await carousel.getAttribute("data-position")).toBe(position);
 await carousel.scrollIntoViewIfNeeded();await expect.poll(()=>carousel.getAttribute("data-position")).not.toBe(position);
 await page.getByRole("button",{name:"Pause automatic rotation"}).click();
});
