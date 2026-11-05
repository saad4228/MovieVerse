import {test,expect} from "@playwright/test";
test("carousel contains bookable city screenings and has slightly tighter spacing",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:"reduce"});
 const expected=await (await page.request.get("/api/bookable-featured?city=chennai")).json();
 expect(expected.featured.length).toBeGreaterThan(0);
 await page.goto("/",{waitUntil:"domcontentloaded"});await expect(page.locator(".featured-movie h2")).toBeVisible();
 const featured=await page.locator(".moonlit-lobby").getAttribute("data-featured-movie");
 expect(expected.featured.some((m:any)=>m.id===featured)).toBe(true);
 for(const href of await page.locator(".panorama-screen>a").evaluateAll(els=>els.map(el=>el.getAttribute("href"))))expect(expected.featured.some((m:any)=>href===`/movies/${m.id}`)).toBe(true);
 const spacing=await page.locator(".cinematic-panorama").evaluate(el=>{
  const panel=el.querySelector<HTMLElement>(".panorama-screen")!;
  return {step:Number((el as HTMLElement).dataset.posterStep),old:Math.max(panel.offsetWidth+parseFloat(getComputedStyle(el).getPropertyValue("--poster-gap")),el.clientWidth/6.9),width:panel.offsetWidth};
 });
 expect(spacing.step).toBeLessThan(spacing.old);expect(spacing.step).toBeGreaterThanOrEqual(spacing.width);
 await page.screenshot({path:"outputs/bookable-carousel.png"});
});
test("movie banners fill the hero without distortion and guest watchlist requires authentication",async({page})=>{
 test.setTimeout(120000);
 const catalogue=await (await page.request.get("/api/catalogue?collection=hollywood")).json();
 for(const id of ["coolie",catalogue.movies[0].id]){
  await page.setViewportSize({width:1440,height:900});await page.goto(`/movies/${id}`,{waitUntil:"domcontentloaded"});
  const art=page.locator(".movie-backdrop-art");await expect(art).toBeVisible();await expect(art).toHaveCSS("object-fit","cover");
  if(id.startsWith("tmdb-"))expect(await art.getAttribute("data-full-resolution-src")).toContain("/original/");
  await expect(page.getByRole("button",{name:/Add to Watchlist/})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("mv-watchlist"))).toBeNull();
  await expect.poll(()=>art.evaluate((img:HTMLImageElement)=>img.naturalWidth),{timeout:30000}).toBeGreaterThan(0);
  await page.screenshot({path:`outputs/movie-banner-${id}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await expect(art).toHaveCSS("object-fit","cover");
  const bounds=await art.boundingBox();const content=await page.locator(id==="coolie"?".movie-hero-bottom":".live-movie-heading h1").boundingBox();
  expect(content!.y).toBeGreaterThanOrEqual(bounds!.y+bounds!.height-2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/movie-banner-${id}-mobile.png`});
 }
 await page.getByRole("button",{name:/Add to Watchlist/}).click();await expect(page).toHaveURL(/\/login\?next=/);
});
