import { test, expect, type Page } from "@playwright/test";
import { dates, venues, showsFor } from "../../lib/catalog";
async function enter(page:Page) {
  await page.addInitScript(()=>localStorage.setItem("movieverse-v1",JSON.stringify({state:{city:"pune",recentCities:[],seats:[],cart:{}},version:0})));
  const show=showsFor(venues.find(v=>v.cityId==="pune")!,"sintel",dates()[3])[0];
  await page.goto(`/booking/${encodeURIComponent(show.id)}`);
  await expect(page.locator("canvas")).toBeVisible();
  const pause=page.getByRole("button",{name:"Pause film",exact:true});if(await pause.count())await pause.click();
  await page.getByRole("button",{name:"2D map",exact:true}).click();
  const options=await page.getByRole("button",{name:/^G\d+, [^,]+, available$/}).all();
  const ids=await Promise.all(options.map(e=>e.getAttribute("aria-label").then(v=>v!.split(",")[0])));
  const pair=ids.find((id,i)=>i+1<ids.length&&Number(ids[i+1].slice(1))===Number(id.slice(1))+1&&Number(id.slice(1))>=7);
  expect(pair).toBeTruthy();const chosen=[pair!,ids[ids.indexOf(pair!)+1]];
  await page.getByRole("button",{name:"3D view",exact:true}).click();
  await page.getByRole("button",{name:/Bird/}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-preset", "Bird\u2019s eye");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving","false");
  return chosen;
}
async function point(page:Page,id:string){return page.locator("canvas").evaluate((el:any,id)=>el.movieverseDiagnostics().seats.find((s:any)=>s.id===id),id);}
async function visual(page:Page,id:string){return page.locator("canvas").evaluate((el:any,id)=>el.movieverseDiagnostics().seatVisuals.find((s:any)=>s.id===id).y,id);}
test("exact adjacent hover/click, physical lift, out-and-back drag, undo and recovery",async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const ids=await enter(page); const before=await visual(page,ids[0]);
  for(let round=0;round<2;round++) for(const id of ids){
    const p=await point(page,id);await page.mouse.move(p.x,p.y);
    await expect(page.locator(".seat-hover strong")).toHaveText(id);
    const camera=await page.locator("canvas").getAttribute("data-camera-position");
    await page.mouse.click(p.x,p.y);
    await expect(page.locator("canvas")).toHaveAttribute("data-camera-position",camera!);
    const row=page.locator(".selected-seats-list > div").filter({has:page.getByText(id,{exact:true})});
    if(round===0)await expect(row).toBeVisible();else await expect(row).toHaveCount(0);
  }
  let p=await point(page,ids[0]);await page.mouse.click(p.x,p.y);await page.mouse.move(10,20);
  await expect.poll(()=>visual(page,ids[0])).toBeCloseTo(before+.065,3);
  await page.screenshot({path:"outputs/seat-polish-desktop.png"});
  await page.getByRole("button",{name:"Undo selection",exact:true}).click();
  await expect.poll(()=>visual(page,ids[0])).toBeCloseTo(before,3);
  p=await point(page,ids[0]);await page.mouse.move(p.x,p.y);await page.mouse.down();
  await page.mouse.move(p.x+35,p.y,{steps:5});await page.mouse.move(p.x,p.y,{steps:5});await page.mouse.up();
  await expect(page.locator(".selected-seats-list > div")).toHaveCount(0);
  await page.getByRole("button",{name:"Reset view",exact:true}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-preset","Overview");
  await page.getByRole("button",{name:"2D map",exact:true}).click();
  for(const id of ids)await page.getByRole("button",{name:new RegExp(`^${id}, .*available`)}).click();
  await page.getByRole("button",{name:"Find my seats",exact:true}).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-preset","Find seats");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving","false");
  expect(errors).toEqual([]);
});
test.describe("touch and reduced motion",()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844},reducedMotion:"reduce"});
 test("tap selects without hover and touch drag never selects",async({page})=>{
  test.setTimeout(180000);const ids=await enter(page);let p=await point(page,ids[0]);
  await page.touchscreen.tap(p.x,p.y);await expect(page.getByRole("button",{name:`Remove ${ids[0]}`,exact:true})).toBeVisible();
  const client=await page.context().newCDPSession(page);p=await point(page,ids[1]);
  await client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:p.x,y:p.y}]});
  await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:p.x+35,y:p.y}]});
  await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:p.x,y:p.y}]});
  await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect(page.getByRole("button",{name:`Remove ${ids[1]}`,exact:true})).toHaveCount(0);
  await page.screenshot({path:"outputs/seat-polish-mobile.png"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
});
