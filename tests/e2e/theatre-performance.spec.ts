import { test, expect } from '@playwright/test';
import { dates, venues, showsFor } from '../../lib/catalog';
import { writeFile } from 'node:fs/promises';
test('theatre performance sample', async ({page})=>{
 const show=showsFor(venues.find(v=>v.cityId==='pune')!,'sintel',dates()[3])[0];
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'pune',recentCities:[],seats:[],cart:{}},version:0})));
 await page.goto(`/booking/${encodeURIComponent(show.id)}`);
 await expect(page.locator('canvas')).toBeVisible();
 await page.waitForTimeout(6000);
 const tour=page.getByRole('button',{name:'Tour',exact:true}); if(await tour.count()) await tour.click();
 const before=await page.locator("canvas").evaluate((el:HTMLCanvasElement)=>el.movieverseDiagnostics());
 const measuredAt=Date.now();
 const result: {fps:number;p95:number;renderer?:string;sceneFps?:number;drawCalls?:number;triangles?:number}=await page.evaluate(()=>new Promise<{fps:number;p95:number;renderer?:string}>(resolve=>{
 const samples:number[]=[];let previous=performance.now();const start=previous;
 function tick(now:number){samples.push(now-previous);previous=now;if(now-start<5000)requestAnimationFrame(tick);else resolve({fps:1000/(samples.reduce((a,b)=>a+b)/samples.length),p95:samples.sort((a,b)=>a-b)[Math.floor(samples.length*.95)],renderer:document.querySelector('canvas')?.dataset.softwareRenderer});}requestAnimationFrame(tick);
 }));
 const after=await page.locator("canvas").evaluate((el:HTMLCanvasElement)=>el.movieverseDiagnostics());
 result.sceneFps=(after.frames-before.frames)/((Date.now()-measuredAt)/1000);result.drawCalls=after.calls;result.triangles=after.triangles;
 console.log(JSON.stringify(result));await writeFile(`outputs/theatre-${process.env.PERF_LABEL||'before'}.json`,JSON.stringify(result));
});

test('paused theatre stops drawing when idle',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'pune',recentCities:[],seats:[],cart:{}},version:0})));
 const show=showsFor(venues.find(v=>v.cityId==='pune')!,'sintel',dates()[3])[0];
 await page.goto(`/booking/${encodeURIComponent(show.id)}`);await expect(page.locator('canvas')).toBeVisible();
 const pause=page.getByRole('button',{name:'Pause film',exact:true});if(await pause.count())await pause.click();
 await page.waitForTimeout(8000);
 const before=await page.locator('canvas').evaluate((el:HTMLCanvasElement)=>el.movieverseDiagnostics().frames);
 await page.waitForTimeout(3000);
 const after=await page.locator('canvas').evaluate((el:HTMLCanvasElement)=>el.movieverseDiagnostics().frames);
 console.log({idleFramesOver3Seconds:after-before});expect(after-before).toBeLessThan(5);
});
