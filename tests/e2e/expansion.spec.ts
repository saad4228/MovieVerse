import {test,expect} from '@playwright/test';
import {dates,showsFor,type Venue,type Movie} from '../../lib/catalog';
test('rotation starts while its button is hovered or focused, pauses, and includes the added films', async ({page}) => {
 await page.goto('/');
 const carousel=page.locator('.cinematic-panorama');
 await expect(carousel).toHaveAttribute('data-position','3.0000');
 const start=page.getByRole('button',{name:'Start automatic rotation',exact:true});
 await start.focus();
 await page.keyboard.press('Enter');
 await expect.poll(async()=>Number(await carousel.getAttribute("data-position"))).toBeGreaterThan(3.1);
 await page.keyboard.press('Space');
 await expect(start).toHaveAttribute('aria-pressed','false');
 const stopped=await carousel.getAttribute("data-position");
 await page.waitForTimeout(600);
 await expect(carousel).toHaveAttribute("data-position",stopped!);
 await start.click();

 // Leave the pointer over the rotation control: its hover must not stop playback.
 await expect.poll(async()=>Number(await carousel.getAttribute("data-position"))).toBeGreaterThan(Number(stopped)+.1);
 await page.getByRole('button',{name:'Pause automatic rotation',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('button',{name:'Automatic rotation off · reduced motion',exact:true})).toBeDisabled();
 const available=await(await page.request.get('/api/bookable-featured?city=chennai')).json();
 const expected=available.featured.map((movie:Movie)=>movie.id);
 const seen=new Set<string>();
 for(let i=0;i<expected.length;i++) {
   await page.getByRole('button',{name:'Next movie',exact:true}).click();
   seen.add((await carousel.getAttribute('data-active-movie'))!);
 }
 expect([...seen].sort()).toEqual(expected.sort());
});
test('panorama exact drag targeting, side click, direction reversal and autoplay pause',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/');
 const carousel=page.locator('.cinematic-panorama');await expect(carousel).toHaveAttribute('data-position','3.0000');
 const box=(await carousel.boundingBox())!;const y=box.y+box.height*.4;
 const drag=async(dx:number,steps:number)=>{await page.mouse.move(1000,y);await page.mouse.down();await page.mouse.move(1000+dx,y,{steps});const pos=Number(await carousel.getAttribute('data-position'));await page.mouse.up();await expect.poll(async()=>Number(await carousel.getAttribute('data-position'))).toBe(Math.round(pos));expect(await carousel.getAttribute('data-active-movie')).toBe(await page.getByRole('region',{name:'Interactive movie panorama'}).getAttribute('data-featured-movie'));};
 await drag(-650,24);await drag(420,2);await drag(-230,8);
 await page.waitForTimeout(450);const target=Number(await carousel.getAttribute('data-target'));await page.locator(`[data-carousel-index="${target+1}"] a`).click();await expect.poll(async()=>Number(await carousel.getAttribute('data-position'))).toBe(target+1);
 await page.getByRole('button',{name:'Start automatic rotation'}).click();await page.mouse.move(10,10);const before=Number(await carousel.getAttribute('data-target'));await expect.poll(async()=>Number(await carousel.getAttribute('data-target')),{timeout:12000}).toBeGreaterThan(before+.1);
 await page.getByRole("button",{name:"Pause automatic rotation"}).click();await drag(220,12);
});
test('screening language and price variants use real persisted demo inventory summaries',async({request})=>{
 const catalog=await (await request.get('/api/catalog')).json();const venue=catalog.venues.find((v:Venue)=>v.cityId==='chennai');const movie=catalog.movies.find((m:Movie)=>m.id==='jailer-2');const shows=showsFor(venue,movie.id,dates()[2],catalog.movies);
 expect(shows).toHaveLength(6);expect(new Set(shows.map(s=>s.language)).size).toBeGreaterThan(1);expect(new Set(shows.map(s=>s.price)).size).toBeGreaterThan(1);
 const show=shows[1];const response=await request.get('/api/inventory?show='+encodeURIComponent(show.id));expect(response.ok()).toBe(true);const snapshot=await response.json();const summaryResponse=await request.get('/api/show-availability?shows='+encodeURIComponent(show.id));expect(summaryResponse.ok()).toBe(true);const summary=(await summaryResponse.json()).summaries[show.id];expect(summary.total).toBe(snapshot.seats.length);expect(summary.available).toBe(Object.values(snapshot.inventory).filter((s:any)=>s.status==='available').length);expect(snapshot.show.movieId).toBe(movie.id);expect(snapshot.show.auditoriumId).toBe(show.auditoriumId);
 const wrong=await request.get('/api/show-availability?shows=unknown');expect(wrong.status()).toBe(400);
});
test('movie metadata, regional releases and Nagpur directory connect to actual records',async({page})=>{
 await page.goto('/movies/leo');await expect(page.getByRole('heading',{name:'Meet the cast.'})).toBeVisible();const photo=page.locator('.person-card img').first();await photo.scrollIntoViewIfNeeded();await expect.poll(()=>photo.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(200);await expect(page.locator('.film-crew')).toContainText('Director');
 await page.goto('/coming-soon');
 const avengers=page.locator('.browse-card-enter').filter({has:page.getByRole('heading',{name:'Avengers: Doomsday',exact:true})});
 await expect(avengers).toBeVisible();
 await expect(avengers.locator('.release-card-date')).toContainText('17 December 2026');
 await page.getByLabel('Release market').selectOption('US');
 await expect(avengers.locator('.release-card-date')).toContainText('18 December 2026');
 await page.goto('/cinemas');await expect(page.locator('.header')).toHaveAttribute('data-interactive','true');await page.getByRole('button',{name:'Chennai',exact:true}).click();await page.getByPlaceholder('Search for your city').fill('Nag');await page.getByRole('button',{name:'Nagpur',exact:true}).click();await expect(page.locator('.venue-directory-grid article')).toHaveCount(18);await page.getByLabel('Search cinema directory').fill('AM Cinema');await expect(page.locator('.venue-directory-grid article')).toHaveCount(5);await page.getByLabel('Search cinema directory').fill('Empress');await expect(page.locator('.venue-directory-grid')).toContainText('Status needs confirmation');await page.getByLabel('Search cinema directory').fill('Sangam');await expect(page.locator('.venue-directory-grid article')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'outputs/expansion-mobile-directory.png',fullPage:true});
});
