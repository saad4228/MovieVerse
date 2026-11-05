import {test,expect} from '@playwright/test';
import {dates,showsFor,makeSeats,type Venue,type Blueprint} from '../../lib/catalog';

test('front, middle and back seat previews retain the larger screen and selected seats',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'chennai',recentCities:[],seats:[],cart:{}},version:0})));
 const catalog=await(await page.request.get('/api/catalog')).json();
 const venue=catalog.venues.find((v:Venue)=>v.cityId==='chennai'&&v.movieIds.includes('sintel')&&v.blueprints.includes('classic'));
 const show=showsFor(venue,'sintel',dates()[4],catalog.movies).find(s=>s.blueprintId==='classic')!;
 await page.goto(`/booking/${encodeURIComponent(show.id)}`);
 await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'2D map',exact:true}).click();
 const ids:string[]=[];
 for(const row of ['A','E','J']){
  const seat=page.getByRole('button',{name:new RegExp(`^${row}\\d+, [^,]+, available(?:,|$)`)}).first();
  const id=(await seat.getAttribute('aria-label'))!.split(',')[0];ids.push(id);await seat.click();
 }
 await page.getByRole('button',{name:'3D view',exact:true}).click();
 const originalCanvas=page.locator('canvas');
 await expect(originalCanvas).toHaveAttribute('data-camera-moving','false');
 const originalPosition=await originalCanvas.getAttribute('data-camera-position');
 const originalTarget=await originalCanvas.getAttribute('data-camera-target');
 await page.getByRole('button',{name:'View from this seat',exact:true}).click();
 const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-video-status','playing',{timeout:60000});
 await expect.poll(async()=>Number(await canvas.getAttribute('data-video-time')),{timeout:30000}).toBeGreaterThan(4);
 await page.getByRole('button',{name:'Pause film',exact:true}).click();
 for(const id of ids){
  await page.getByLabel('Preview selected seat').selectOption(id);
  await expect.poll(()=>canvas.getAttribute('data-camera-moving'),{timeout:20000}).toBe('false');
  const blueprint=catalog.blueprints.find((b:Blueprint)=>b.id==='classic');
  const seat=makeSeats(blueprint).find(s=>s.id===id)!;
  await expect.poll(async()=>{
   const p=(await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
   return Math.max(Math.abs(p[0]-seat.x),Math.abs(p[1]-seat.y-1.5),Math.abs(p[2]-seat.z+.2));
  }).toBeLessThan(.002);
  const frame=JSON.parse((await canvas.getAttribute('data-screen-frame'))!);
  const target=(await canvas.getAttribute('data-camera-target'))!.split(',').map(Number);
  expect(target[1]).toBeCloseTo(frame.y,2);expect(target[2]).toBeCloseTo(frame.z + .03,2);
  await page.screenshot({path:`outputs/large-screen-seat-${id}.png`});
 }
 await page.getByRole('button',{name:'Next Seat',exact:true}).click();
 await expect(page.getByLabel('Preview selected seat')).toHaveValue(ids[0]);
 await page.getByRole('button',{name:'Previous Seat',exact:true}).click();
 await expect(page.getByLabel('Preview selected seat')).toHaveValue(ids[2]);
 await page.getByRole('button',{name:'Exit Preview',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-camera-moving','false');
 await expect(canvas).toHaveAttribute('data-camera-position',originalPosition!);
 await expect(canvas).toHaveAttribute('data-camera-target',originalTarget!);
 await page.getByRole('button',{name:'2D map',exact:true}).click();
 for(const id of ids)await expect(page.getByRole('button',{name:new RegExp(`^${id}, [^,]+, selected`)})).toBeVisible();
 expect(errors).toEqual([]);
});

for(const style of ['grand','luxury']) test(`single or paired seat preview and mobile exit: ${style}`,async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'chennai',recentCities:[],seats:[],cart:{}},version:0})));
 const catalog=await(await page.request.get('/api/catalog')).json();
 const venue=catalog.venues.find((v:Venue)=>v.cityId==='chennai'&&v.movieIds.includes('sintel')&&v.blueprints.includes(style));
 const show=showsFor(venue,'sintel',dates()[4],catalog.movies).find(s=>s.blueprintId===style)!;
 await page.goto(`/booking/${encodeURIComponent(show.id)}`);
 await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'2D map',exact:true}).click();
 await expect(page.getByRole('button',{name:'View from this seat',exact:true})).toHaveCount(0);
 const seat=page.getByRole('button',{name:/^[A-Z]\d+, [^,]+, available(?:,|$)/}).last();
 const id=(await seat.getAttribute('aria-label'))!.split(',')[0];await seat.click();
 await page.getByRole('button',{name:'View from this seat',exact:true}).click();
 const canvas=page.locator('canvas');
 const blueprint=catalog.blueprints.find((b:Blueprint)=>b.id===style);
 const actual=makeSeats(blueprint).find(s=>s.id===id)!;
 await expect.poll(async()=>{
  const value=await canvas.getAttribute('data-camera-position');if(!value)return Infinity;
  const p=value.split(',').map(Number);
  return Math.max(Math.abs(p[0]-actual.x),Math.abs(p[1]-actual.y-1.5),Math.abs(p[2]-actual.z+.2));
 },{timeout:30000}).toBeLessThan(.002);
 await expect(page.getByRole('button',{name:'Next Seat',exact:true})).toHaveCount(style==='luxury'?1:0);
 const controls=await page.locator(".seat-view-return").boundingBox();
 const metrics=await page.locator(".seat-view-metrics").boundingBox();
 expect(metrics!.y).toBeGreaterThan(controls!.y+controls!.height);
 await page.getByRole("button",{name:"More theatre controls",exact:true}).click();
 await expect(page.getByRole("button",{name:"Fullscreen cinema",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"More theatre controls",exact:true}).click();
 await page.screenshot({path:`outputs/seat-preview-${style}-mobile.png`});
 await page.getByRole('button',{name:'Exit Preview',exact:true}).click();
 await expect(page.getByRole('button',{name:new RegExp(`^${id}, [^,]+, selected`)})).toBeVisible();
});
