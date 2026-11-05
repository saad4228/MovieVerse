import {test,expect,type Page} from "@playwright/test";

async function openAndReturn(page:Page,source:string,selector=".movie-art",browserBack=false){
 await page.goto(source,{waitUntil:"domcontentloaded"});
 const card=page.locator(selector).first();await expect(card).toBeVisible();await card.scrollIntoViewIfNeeded();
 const origin=new URL(page.url());const returnTo=origin.pathname+origin.search;
 const y=await page.evaluate(()=>scrollY);
 await card.click();await expect.poll(()=>new URL(page.url()).pathname).toMatch(/^\/movies\//);await expect(page.locator(".back-link")).toBeVisible();
 expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
 await expect(page.locator(".back-link")).toHaveAttribute("href",returnTo);
 if(browserBack)await page.goBack();else await page.locator(".back-link").click();
 await expect(page).toHaveURL(new RegExp(returnTo.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"$"));
 await expect(card).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>scrollY),{timeout:10000}).toBeGreaterThanOrEqual(Math.max(0,y-60));
}

test("movie details return to each major source and preserve filters, page and browser history",async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:"reduce"});
 await openAndReturn(page,"/coming-soon?language=English");
 await page.getByRole("combobox").filter({has:page.locator('option[value="US"]')}).first().selectOption("US");
 await page.locator('.sort-label select').last().selectOption("A–Z");
 await expect(page.locator(".movie-art").first()).toBeVisible();
 await page.getByRole("button",{name:"Next page",exact:true}).click();await expect(page.locator(".genre-pagination")).toContainText("2 /");
 const card=page.locator(".movie-art").first();await card.click();await page.locator(".back-link").click();
 await expect(page.locator('.sort-label select').last()).toHaveValue("A–Z");await expect(page.getByLabel("Release market")).toHaveValue("US");
 await expect(page.locator(".genre-pagination")).toContainText("2 /");
 await openAndReturn(page,"/movies");
 await page.goto("/movies");await expect(page.getByLabel("Search cinema movies")).toBeVisible();
 await page.getByLabel("Search cinema movies").fill("Coolie");const nowShowingCard=page.locator(".movie-art").first();await expect(nowShowingCard).toBeVisible();
 await nowShowingCard.click();await expect.poll(()=>new URL(page.url()).pathname).toMatch(/^\/movies\//);await page.locator(".back-link").click();
 await expect(page.getByLabel("Search cinema movies")).toHaveValue("Coolie");await expect(page.locator(".movie-art").first()).toBeVisible();
 await openAndReturn(page,"/explore?collection=hollywood", ".movie-art",true);
 await openAndReturn(page,"/genres/action?country=US&sort=rated&page=2");
 await openAndReturn(page,"/explore", ".explore-collection .movie-art");
 await openAndReturn(page,"/", ".panorama-screen.current a");
 await expect(page.locator(".panorama-screen.current")).toBeVisible();
});

test("search return restores search results and direct details have a safe fallback",async({page})=>{
 await page.goto("/cinemas",{waitUntil:"domcontentloaded"});await expect(page.locator('header[data-interactive="true"]')).toBeVisible();await page.getByRole("button",{name:"Search movies and cinemas"}).click();
 await page.getByLabel("Search movies, cinemas and cities").fill("Dark Knight");
 const result=page.locator(".search-result").filter({hasText:"The Dark Knight"}).first();await expect(result).toBeVisible();await result.click();
 await expect(page.locator(".back-link")).toBeVisible();await page.locator(".back-link").click();
 await expect(page.getByLabel("Search movies, cinemas and cities")).toHaveValue("Dark Knight");await expect(result).toBeVisible();
 await page.goto("/movies/coolie?returnTo=https%3A%2F%2Fevil.test",{waitUntil:"domcontentloaded"});await expect(page.locator(".back-link")).toHaveAttribute("href","/movies");
 await page.goto("/movies/coolie",{waitUntil:"domcontentloaded"});await expect(page.locator(".back-link")).toHaveAttribute("href","/movies");
});

test("compact Watchlist, red saved hearts and aligned homepage promotion work on desktop and mobile",async({page})=>{
 test.setTimeout(120000);
 await page.request.post("/api/register",{data:{name:"UI Tester",email:`polish-${crypto.randomUUID()}@example.test`,password:"Cinema-Test-2026!"}});
 for(const id of ["coolie","toxic","jailer-2"]){const saved=await page.request.post("/api/watchlist",{data:{id,saved:true}});expect(saved.ok()).toBe(true);}
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto("/watchlist",{waitUntil:"domcontentloaded"});await expect(page.locator(".watchlist-card")).toHaveCount(3);
  const card=page.locator(".watchlist-card").first();expect((await card.boundingBox())!.height).toBeLessThan(440);
  const columns=await page.locator(".watchlist-grid").evaluate(node=>getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length);expect(columns).toBeGreaterThanOrEqual(width<600?2:4);
  await expect(card.locator(".watchlist-toggle svg")).toHaveCSS("fill","rgb(239, 68, 68)");
  await expect(card.locator(".watchlist-card-actions .btn").first()).toBeVisible();
  const poster=await card.locator(".watchlist-art").boundingBox();expect(poster!.height/poster!.width).toBeCloseTo(1.5,1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/watchlist-compact-${width}.png`});
  await page.goto("/",{waitUntil:"domcontentloaded"});const banner=page.locator(".home-explore-promo");await banner.scrollIntoViewIfNeeded();
  await expect(banner.getByRole("link",{name:/Explore Movies/})).toHaveAttribute("href","/explore");
  await expect.poll(()=>banner.locator(".home-explore-collage img").count()).toBeGreaterThanOrEqual(1);
  for(const image of await banner.locator(".home-explore-collage img").all()){expect(new URL((await image.getAttribute("src"))!).hostname).toBe("image.tmdb.org");}
  await expect(page.locator(".cinema-callout")).toHaveCount(0);
  const bounds=(await banner.boundingBox())!,creator=(await page.locator(".creator-section").boundingBox())!;
  expect(Math.abs(bounds.x-creator.x)).toBeLessThan(2);expect(Math.abs(bounds.width-creator.width)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/home-promo-aligned-${width}.png`});
 }
 await page.goto("/movies/coolie",{waitUntil:"domcontentloaded"});const toggle=page.getByRole("button",{name:"In Watchlist",exact:true});await expect(toggle.locator("svg")).toHaveCSS("fill","rgb(239, 68, 68)");await toggle.click();
 await expect(page.getByRole("button",{name:"Add to Watchlist",exact:true}).locator("svg")).toHaveAttribute("fill","none");
});
