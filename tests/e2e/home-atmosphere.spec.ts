import {test,expect} from "@playwright/test";

for(const width of [1440,390]){
  test(`homepage atmosphere and compact partner transition at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto("/");
    const home=page.locator(".movieverse-home");
    await expect(home).toBeVisible();
    await expect(page.locator(".home-navbar")).toBeVisible();
    const hero=page.locator(".moonlit-lobby .lobby-backdrop");
    await expect(hero).toHaveAttribute("src","/assets/moonlit-theater.png");
    expect(await page.locator(".home-showing").evaluate(el=>getComputedStyle(el).backgroundImage)).toContain("radial-gradient");
    const background=await page.locator(".experience-section").evaluate(el=>getComputedStyle(el,"::before").backgroundImage);
    expect(background).toContain("radial-gradient");
    // Scroll normally so one-shot reveals and existing lazy images are observed.
    for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=650){
      await page.evaluate(y=>scrollTo({top:y,behavior:"instant"}),y);await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    const partner=page.locator(".advance-section");
    await expect(partner).toHaveClass(/is-empty/);
    const gap=await page.evaluate(()=>{
      const empty=document.querySelector(".advance-section .discovery-empty")!.getBoundingClientRect();
      const collage=document.querySelector(".universe-wall")!.getBoundingClientRect();return collage.top-empty.bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(20);expect(gap).toBeLessThanOrEqual(40);
    await expect(page.locator(".experience-copy")).toHaveClass(/is-revealed/);
    expect(await page.locator(".experience-section").evaluate(el=>getComputedStyle(el,"::before").backgroundImage)).toBe(background);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator(".creator-invitation")).toBeVisible();
    await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
    await page.waitForTimeout(150);
    await page.screenshot({path:`outputs/home-atmosphere-${width}.png`,fullPage:true,animations:"disabled"});
    await page.emulateMedia({reducedMotion:"reduce"});
    await expect(page.locator(".experience-copy")).toHaveCSS("opacity","1");
    await expect(page.locator(".experience-copy")).toHaveCSS("translate","none");
    await page.goto("/movies");
    await expect(page.locator(".movieverse-home")).toHaveCount(0);
    await expect(page.locator(".movie-grid")).toBeVisible();
  });
}
