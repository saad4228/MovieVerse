import {test,expect} from '@playwright/test';
import {dates,showsFor} from '../../lib/catalog';
import type {Venue, Show} from '../../lib/catalog';

test('enlarged screen fits all auditorium styles and keeps playback and presets working',async({page})=>{
 test.setTimeout(240000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'chennai',recentCities:[],seats:[],cart:{}},version:0})));
 const catalog=await(await page.request.get('/api/catalog')).json();
 const shows=catalog.venues.filter((v:Venue)=>v.cityId==='chennai'&&v.movieIds.includes('sintel')).flatMap((v:Venue)=>showsFor(v,'sintel',dates()[3],catalog.movies));
 for(const id of ['grand','classic','luxury']){
  const show=shows.find((s:Show)=>s.blueprintId===id)!;expect(show).toBeTruthy();
  await page.goto(`/booking/${encodeURIComponent(show.id)}`);
  const canvas=page.locator('canvas');await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-video-status','playing',{timeout:60000});
  // Let the source trailer pass its authored black opening before capturing.
  await expect.poll(async()=>Number(await canvas.getAttribute('data-video-time')),{timeout:30000}).toBeGreaterThan(4);
  await expect.poll(()=>canvas.getAttribute('data-camera-moving')).toBe('false');
  const frame=JSON.parse((await canvas.getAttribute('data-screen-frame'))!);
  const blueprint=catalog.blueprints.find((b:{id:string})=>b.id===id);
  expect(frame.width/(blueprint.width-1.6)).toBeGreaterThanOrEqual(.75);
  expect(frame.width/frame.height).toBeCloseTo(16/9,6);
  const texture=await canvas.getAttribute('data-video-texture-id');expect(texture).toBeTruthy();
  await page.screenshot({path:`outputs/large-screen-${id}-overview.png`});
  console.log({id,frame,canvas:await canvas.boundingBox(),diagnostics:await canvas.evaluate((el:any)=>{const d=el.movieverseDiagnostics();return {room:d.room,screenSize:d.screenSize,corners:d.screenCorners,drawCalls:d.calls,triangles:d.triangles}})});
  if(id==='classic'){
   for(const preset of ['From stage','Bird','Overview']){
    const button=page.getByRole('button',{name:preset==='Bird'?/Bird/:preset,exact:preset!=='Bird'});
    await button.click();
    await expect(canvas).toHaveAttribute('data-camera-preset',preset==='Bird'?/Bird/:preset);
    await expect.poll(()=>canvas.getAttribute('data-camera-moving')).toBe('false');
    await expect(canvas).toHaveAttribute('data-video-texture-id',texture!);
    await page.screenshot({path:`outputs/large-screen-classic-${preset.replace(/[^a-z]/gi,'-')}.png`});
   }
   const time=Number(await canvas.getAttribute('data-video-time'));
   await page.getByRole('button',{name:'Tour',exact:true}).click();await page.waitForTimeout(4000);
   expect(Number(await canvas.getAttribute('data-video-time'))).toBeGreaterThan(time);
   await page.getByRole('button',{name:'Overview',exact:true}).click();
   await page.setViewportSize({width:390,height:844});
   await expect.poll(()=>canvas.getAttribute('data-camera-moving')).toBe('false');
   await page.screenshot({path:'outputs/large-screen-mobile.png'});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const bounds=(await canvas.boundingBox())!;
   const corners=await canvas.evaluate((el:any)=>el.movieverseDiagnostics().screenCorners);
   console.log(JSON.stringify({mobileScreenCorners:corners,canvas:bounds}));
   for(const corner of corners){expect(corner.x).toBeGreaterThanOrEqual(bounds.x);expect(corner.x).toBeLessThanOrEqual(bounds.x+bounds.width);}

   await page.setViewportSize({width:1280,height:720});
  }
 }
 expect(errors).toEqual([]);
});
