import {test,expect} from '@playwright/test';

test('movie details start at the viewport top with Back navigation on desktop and mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:844});
  for(const id of ['jailer-2','sintel']){
   await page.goto(`/movies/${id}`);
   await expect(page.locator('.movie-hero')).toBeVisible();
   await expect(page.locator('.header')).toHaveCount(0);
   await expect.poll(async()=>Math.round((await page.locator('.movie-hero').boundingBox())!.y)).toBe(0);
   const back=page.getByRole('link',{name:'Back to movies',exact:true});await expect(back).toBeVisible();
   const bounds=(await back.boundingBox())!;expect(bounds.y).toBeGreaterThanOrEqual(20);expect(bounds.y).toBeLessThan(50);
   await expect(page.locator('.movie-identity h1')).toBeVisible();
   await expect(page.locator('.movie-hero-actions')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`outputs/movie-detail-${id}-${width}.png`});
   await back.click();await expect(page).toHaveURL(/\/movies$/);await expect(page.locator('.header')).toBeVisible();
  }
 }
 expect(errors).toEqual([]);
});

test('normal routes retain navbar, search and route changes',async({page})=>{
 for(const route of ['/','/movies','/cinemas','/coming-soon','/my-tickets','/login']){
  await page.goto(route);await expect(page.locator('.header')).toBeVisible();
 }
 await page.goto('/movies');
 await page.getByRole('button',{name:'Search movies and cinemas'}).click();
 await expect(page.getByRole('dialog',{name:'Search MovieVerse'})).toBeVisible();
 await page.keyboard.press('Escape');
 await page.locator('.header').getByRole('link',{name:'Cinemas',exact:true}).click();
 await expect(page).toHaveURL(/\/cinemas$/);await expect(page.locator('.header')).toBeVisible();
});

test('TMDB detail route also hides navbar and retains its back link on success or error',async({page})=>{
 const catalog=await(await page.request.get('/api/catalog')).json();
 await page.route('**/api/tmdb-movie?*',route=>route.fulfill({json:{movie:{...catalog.movies.find((m:{id:string})=>m.id==='sintel'),id:'tmdb-123'}}}));
 await page.goto('/movies/tmdb-123');
 await expect(page.locator('.live-movie-hero')).toBeVisible();await expect(page.locator('.header')).toHaveCount(0);
 await expect.poll(async()=>Math.round((await page.locator('.live-movie-hero').boundingBox())!.y)).toBe(0);
 await expect(page.getByRole('link',{name:'Back to movies',exact:true})).toBeVisible();
 await page.unroute('**/api/tmdb-movie?*');
 await page.route('**/api/tmdb-movie?*',route=>route.fulfill({status:503,json:{error:'Fixture provider unavailable'}}));
 await page.reload();await expect(page.getByRole('status')).toContainText('Fixture provider unavailable');
 await expect(page.locator('.header')).toHaveCount(0);
 await page.getByRole('link',{name:'Back to movies',exact:true}).click();
 await expect(page).toHaveURL(/\/movies$/);await expect(page.locator('.header')).toBeVisible();
});
