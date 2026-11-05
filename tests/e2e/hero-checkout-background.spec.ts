import {test,expect} from "@playwright/test";

test("hero discovery cue sits below its compact card on desktop, short screens and mobile",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator(".moonlit-lobby")).toBeVisible();
  for(const [width,height] of [[1440,900],[1440,720],[1280,720],[390,844]]){
    await page.setViewportSize({width,height});
    await expect.poll(async()=>{
      const card=await page.locator(".featured-movie").boundingBox();
      const poster=await page.locator(".panorama-screen.current .screen-poster").boundingBox();
      return card!.y-poster!.y-poster!.height;
    }).toBeGreaterThanOrEqual(8);
    const card=await page.locator(".featured-movie").boundingBox();
    const cue=await page.locator(".lobby-bottom>a").boundingBox();
    expect(cue!.y-card!.y-card!.height).toBeGreaterThanOrEqual(16);
    expect(cue!.y+cue!.height).toBeLessThanOrEqual(height);
    await expect(page.locator(".lobby-bottom>a")).toHaveAttribute("href","#now-showing");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`outputs/hero-discover-${width}.png`});
  }
});

test("Snacks and Payment share the supplied centered backdrop without changing the booking flow",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/movies/sintel");
  await page.getByRole("button",{name:/TOMORROW/}).click();
  await page.getByRole("button",{name:"10:30 Sintel at Palazzo",exact:true}).click();
  await expect(page.locator(".checkout-route-shell")).toHaveCount(0);
  await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
  await page.getByRole("button",{name:/Continue.*Add snacks/}).click();
  await expect(page).toHaveURL(/\/snacks$/);
  const background=()=>page.locator(".checkout-route-shell").evaluate(el=>{
    const style=getComputedStyle(el,"::before");return {image:style.backgroundImage,size:style.backgroundSize,position:style.backgroundPosition};
  });
  const snacks=await background();
  expect(snacks.image).toContain("cinema-snacks-screening.webp");
  expect(snacks.image).toContain("0.6");
  expect(snacks.size.split(",").every(value=>value.trim()==="cover")).toBe(true);expect(snacks.position.split(",").every(value=>value.trim()==="50% 50%")).toBe(true);
  await page.locator(".snack-card").first().getByRole("button",{name:"Add",exact:true}).click();
  await expect(page.locator(".snack-card.in-cart")).toHaveCount(1);
  await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:"outputs/snacks-velvet-desktop.png"});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"outputs/snacks-velvet-mobile.png"});
  await page.getByRole("link",{name:"Continue to checkout",exact:true}).click();
  await expect(page.getByLabel("Your name")).toBeVisible();
  expect(await background()).toEqual(snacks);
  await page.getByLabel("Your name").fill("Background Test");
  await page.getByLabel("Email address").fill("background@example.test");
  await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:"outputs/payment-velvet-mobile.png"});
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:"outputs/payment-velvet-desktop.png"});
  await page.goto("/movies");
  await expect(page.locator(".movie-grid")).toBeVisible();
  await expect(page.locator(".checkout-route-shell")).toHaveCount(0);
});
