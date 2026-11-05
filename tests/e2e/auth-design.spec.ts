import { test, expect } from "@playwright/test";

test("authentication fits desktop viewports and preserves a stable, transparent scene", async ({ page }) => {
  for (const [width,height] of [[1920,1080],[1600,900],[1440,900],[1366,768],[1280,720]]) {
    await page.setViewportSize({width,height});
    await page.goto("/register");
    await expect(page.getByRole("heading",{name:"Join the universe."})).toBeVisible();
    await expect(page.locator(".auth-poster img")).toHaveCount(16);
    await expect(page.locator(".footer")).toHaveCount(0);
    const geometry=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,background:getComputedStyle(document.querySelector(".header")!).backgroundColor,story:document.querySelector(".auth-story h1")!.getBoundingClientRect().toJSON(),fine:document.querySelector(".auth-form-content .fine-print")!.getBoundingClientRect().toJSON(),srcs:Array.from(document.querySelectorAll<HTMLImageElement>(".auth-poster img"),i=>i.src)}));
    expect(geometry.height).toBeLessThanOrEqual(height+1);
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.background).toBe("rgba(0, 0, 0, 0)");
    expect(geometry.story.bottom).toBeLessThan(height-70);
    expect(geometry.fine.bottom).toBeLessThanOrEqual(height);
    expect(new Set(geometry.srcs).size).toBe(16);
    await expect(page.locator(".auth-collage")).toHaveCSS("opacity","1");
    await expect.poll(()=>page.locator(".auth-poster img").evaluateAll(images=>images.filter(image=>(image as HTMLImageElement).naturalWidth>=300).length)).toBe(16);
    await page.locator(".auth-poster img").evaluateAll(async images=>{
      await Promise.all(images.map(image=>(image as HTMLImageElement).decode()));
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    });
    if ([1920,1440,1366].includes(width)) await page.screenshot({path:`test-results/auth-register-${width}.png`});
    const oldScene=await page.locator(".auth-collage").elementHandle();
    await page.locator(".auth-switch").getByRole("link",{name:"Sign in",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Welcome back."})).toBeVisible();
    expect(await oldScene!.evaluate(el=>el.isConnected)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
    await page.getByLabel("Password",{exact:true}).fill("example-password");
    await page.getByRole("button",{name:"Show password",exact:true}).click();
    await expect(page.getByLabel("Password",{exact:true})).toHaveAttribute("type","text");
    await page.getByRole("button",{name:"Hide password",exact:true}).click();
    await expect(page.getByLabel("Password",{exact:true})).toHaveAttribute("type","password");
    if ([1920,1440,1366].includes(width)) await page.screenshot({path:`test-results/auth-login-${width}.png`});
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.setViewportSize({width:1280,height:560});
  await page.goto("/register");
  await page.locator(".fine-print").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link",{name:"Keep exploring as a guest"})).toBeVisible();
  await expect(page.locator(".auth-collage")).toHaveCSS("animation-name","none");
});

test("mobile auth remains accessible and real registration/login/guest flow works", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/register");
  const email=`auth-polish-${Date.now()}@example.test`;
  await page.getByLabel("Your name",{exact:true}).fill("Cinema Tester");
  await page.getByLabel("Email address",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill("Cinema-Testing-2026");
  await page.getByRole("button",{name:"Create your account",exact:true}).scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:"test-results/auth-register-mobile.png",fullPage:true});
  await page.getByRole("button",{name:"Create your account",exact:true}).click();
  await expect(page).toHaveURL(/\/account/);
  await page.request.post("/api/logout",{data:{}});
  await page.goto("/login");
  await page.getByLabel("Email address",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill("wrong-password");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password",{exact:true}).fill("Cinema-Testing-2026");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/login");
  await page.getByRole("link",{name:"Keep exploring as a guest"}).click();
  await expect(page).toHaveURL(/\/movies/);
  await expect(page.locator(".header")).not.toHaveClass(/auth-navbar/);
});
