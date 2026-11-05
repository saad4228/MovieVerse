import {test,expect} from '@playwright/test';
import {dates,venues,showsFor} from '../../lib/catalog';
import type {InventorySnapshot} from '../../lib/providers';
import {clampRoom,cameraObstructed,cameraView,type Point} from '../../lib/auditorium';
test('fast orbit, pan and zoom stay inside floor, seats and room boundaries',async({page})=>{
 test.setTimeout(150000);
 await page.addInitScript(()=>localStorage.setItem('movieverse-v1',JSON.stringify({state:{city:'pune',recentCities:[],seats:[],cart:{}},version:0})));
 const show=showsFor(venues.find(v=>v.cityId==='pune')!,'sintel',dates()[3])[0];
 const {blueprint:b,seats}:InventorySnapshot=await(await page.request.get(`/api/inventory?show=${encodeURIComponent(show.id)}`)).json();
 await page.goto(`/booking/${encodeURIComponent(show.id)}`);
 const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-camera-moving','false');
 await expect(canvas).toHaveAttribute('data-camera-position',/^-?[\d.]+,-?[\d.]+,-?[\d.]+$/);
 const box=(await canvas.boundingBox())!;
 const x=box.x+box.width*.5,y=box.y+box.height*.55;
 const positions:string[]=[];
 for(const [dx,dy,button] of [[500,0,'left'],[-700,400,'left'],[0,-600,'left'],[700,500,'right'],[-900,-700,'right'],[0,800,'right']] as const){
   await page.mouse.move(x,y);await page.mouse.down({button});await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up({button});
   await page.waitForTimeout(500);
   const raw=(await canvas.getAttribute('data-camera-position'))!;positions.push(raw);
   const p=raw.split(',').map(Number) as Point, bounded=clampRoom(b,p);
   for(let i=0;i<3;i++)expect(Math.abs(p[i]-bounded[i])).toBeLessThan(.002);
   expect(cameraObstructed(b,seats,p)).toBe(false);
 }
 for(const delta of [9000,-18000,18000]){
   await page.mouse.move(x,y);await page.mouse.wheel(0,delta);await page.waitForTimeout(700);
   const p=(await canvas.getAttribute('data-camera-position'))!.split(',').map(Number) as Point;
   const bounded=clampRoom(b,p);for(let i=0;i<3;i++)expect(Math.abs(p[i]-bounded[i])).toBeLessThan(.002);
   expect(cameraObstructed(b,seats,p)).toBe(false);
 }
 expect(new Set(positions).size).toBeGreaterThan(2);
 await page.getByRole('button',{name:'Overview',exact:true}).click();
 const expected=cameraView(b,'Overview',seats,null,0).position;
 await expect.poll(async()=>{
  const p=(await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  return Math.max(...p.map((n,i)=>Math.abs(n-expected[i])));
 },{timeout:20000}).toBeLessThan(.002);
 expect(await page.evaluate(()=>window.getSelection()?.toString()||'')).toBe('');
 await page.screenshot({path:'outputs/camera-boundaries-overview.png'});
});
