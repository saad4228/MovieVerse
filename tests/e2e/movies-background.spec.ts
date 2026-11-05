import {test,expect} from '@playwright/test';

test('Movies listing keeps cinematic artwork through scrolling and preserves discovery controls',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'nagpur',recentCities:[],seats:[],cart:{}},version:0})));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/movies');
 const cards=page.locator('.movie-grid .movie-card'),layer=page.locator('.movies-background'),nav=page.locator('.header');
 await expect(cards.first()).toBeVisible();await expect(layer).toHaveCount(1);
 await expect(nav).toHaveClass(/movies-navbar/);
 expect(await nav.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 expect(await layer.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('cinema-theater-background.webp');
 const count=await cards.count();const poster=await cards.first().locator('img').getAttribute('src');
 await page.screenshot({path:'outputs/movies-gallery-desktop-top.png'});
 await page.evaluate(()=>window.scrollTo(0,1000));expect(await layer.evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
 await page.screenshot({path:'outputs/movies-gallery-desktop-middle.png'});
 await page.getByLabel('Search movie titles',{exact:true}).fill('Sintel');await expect(cards).toHaveCount(1);
 await page.getByLabel('Search movie titles',{exact:true}).fill('');await expect(cards).toHaveCount(count);
 await expect(cards.first().locator('img')).toHaveAttribute('src',poster!);
 await page.getByRole('button',{name:'Hindi',exact:true}).click();await expect(page).toHaveURL(/language=Hindi/);expect(await cards.count()).toBeLessThan(count);
 await page.getByRole('button',{name:'All',exact:true}).click();await expect(cards).toHaveCount(count);
 await page.getByLabel('Filter genre',{exact:true}).selectOption('Action');expect(await cards.count()).toBeGreaterThan(0);
 await page.getByLabel('Filter genre',{exact:true}).selectOption('All genres');await expect(cards).toHaveCount(count);
 await page.getByRole('combobox',{name:'Sort by'}).selectOption('Top rated');await expect(cards).toHaveCount(count);
 await page.getByRole('button',{name:'Search movies and cinemas'}).click();await expect(page.getByRole('dialog',{name:'Search MovieVerse'})).toBeVisible();await page.keyboard.press('Escape');
 for(const width of [768,390]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`outputs/movies-gallery-${width}.png`});
 }
 await cards.first().locator('a').first().click();await expect(page).toHaveURL(/movies\/[^/?]+/);await expect(layer).toHaveCount(0);await expect(nav).toHaveCount(0);
 await page.goto('/coming-soon');await expect(nav).toHaveClass(/movies-navbar/);await expect(layer).toHaveCount(1);
 await expect(page.locator('.movie-grid .movie-card').first()).toBeVisible();
 expect(await layer.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('cinema-theater-background.webp');
 await page.screenshot({path:'outputs/coming-soon-theater-background-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'outputs/coming-soon-theater-background-desktop.png'});
 await page.evaluate(()=>window.scrollTo(0,800));expect(await layer.evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
 await page.goto('/cinemas');await expect(page.locator('.cinema-background')).toHaveCount(1);await expect(nav).toHaveClass(/cinema-navbar/);await expect(layer).toHaveCount(0);
 await page.goto('/');await expect(page.getByRole('region',{name:'Interactive movie panorama'})).toBeVisible();await expect(layer).toHaveCount(0);await expect(nav).toHaveClass(/home-navbar/);
 expect(errors).toEqual([]);
});
