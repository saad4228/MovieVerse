import {test,expect} from '@playwright/test';

test('Cinemas keep a shared viewport background, compact spacing and route-specific navigation',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'nagpur',recentCities:[],seats:[],cart:{}},version:0})));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/cinemas');
 const layer=page.locator('.cinema-background'),nav=page.locator('.header');
 await expect(layer).toHaveCount(1);await expect(nav).toHaveClass(/cinema-navbar/);
 await expect(page.locator('.verified-directory .eyebrow')).toBeVisible();
 const spacing=await page.evaluate(()=>{
  const subtitle=document.querySelector('.page-intro > p')!.getBoundingClientRect();
  const eyebrow=document.querySelector('.verified-directory .eyebrow')!.getBoundingClientRect();
  return eyebrow.top-subtitle.bottom;
 });expect(spacing).toBeGreaterThanOrEqual(28);expect(spacing).toBeLessThanOrEqual(36);
 expect(await layer.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
 expect(await layer.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('cinema-theater-background.webp');
 expect(await nav.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await page.screenshot({path:'outputs/cinemas-full-page-top.png'});
 const cards=page.locator('.venue-directory-grid article'),count=await cards.count();
 await page.getByLabel('Search cinema directory',{exact:true}).fill('Bansi');await expect(cards).toHaveCount(1);
 await page.getByLabel('Search cinema directory',{exact:true}).fill('');await expect(cards).toHaveCount(count);
 const detail=await cards.first().locator('a').first().getAttribute('href');
 const demo=await page.locator('.cinema-card a').first().getAttribute('href');
 await page.evaluate(()=>window.scrollTo(0,Math.min(1700,document.documentElement.scrollHeight/2)));
 expect(await layer.evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
 await page.screenshot({path:'outputs/cinemas-full-page-middle.png'});
 for(const route of [detail,demo]){
  await page.goto(route!);await expect(page.locator('.cinema-art-detail')).toBeVisible();
  await expect(page.locator('.cinema-background-detail')).toHaveCount(1);
  await expect(nav).toHaveClass(/cinema-navbar/);
  await page.screenshot({path:`outputs/cinemas-full-page-${route===detail?'directory':'demo'}.png`});
  await page.evaluate(()=>window.scrollTo(0,500));expect(await layer.evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
 }
 for(const [width,height] of [[768,1024],[390,844]]){
  await page.setViewportSize({width,height});await page.goto('/cinemas');await expect(page.locator('.cinema-list-hero')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/cinemas-full-page-${width}.png`});
  await page.goto(detail!);await expect(page.locator('.cinema-directory-hero')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/cinemas-detail-${width}.png`});
 }
 await page.goto('/movies');await expect(nav).toHaveClass(/movies-navbar/);await expect(layer).toHaveCount(0);
 await page.goto('/coming-soon');await expect(nav).toHaveClass(/movies-navbar/);await expect(layer).toHaveCount(0);
 expect(errors).toEqual([]);
});
