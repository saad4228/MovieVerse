import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { cameraView, cameraObstructed } from "../../lib/auditorium";
import { balconyFrame } from "../../lib/balcony";

async function enterGrand(page: Page, movie = "sintel") {
  const catalogResponse=page.waitForResponse(r=>r.url().endsWith("/api/catalog")&&r.ok());
  await page.goto(`/movies/${movie}`);
  const catalog=await (await catalogResponse).json();
  await page.getByRole("button",{name:/TOMORROW/}).click();
  const venues=catalog.venues.filter((v:any)=>v.blueprints[0]==="grand");
  const row=page.locator(".screening-row").filter({has:page.getByRole("heading",{name:new RegExp(venues.map((v:any)=>v.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"))})}).first();
  const inventoryResponse=page.waitForResponse(r=>r.url().includes("/api/inventory?")&&r.ok());
  await row.locator(".time-slot").first().click();
  const inventory=await (await inventoryResponse).json();
  expect(inventory.blueprint.id).toBe("grand");
  await expect(page.locator("canvas")).toHaveAttribute("data-camera-moving","false",{timeout:60000});
  return inventory;
}

test("Grand balcony is elevated, selectable in both maps and explorable at eye level",async({page})=>{
  test.setTimeout(180000);
  await page.setViewportSize({width:1440,height:900});
  const inventory=await enterGrand(page);
  const canvas=page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-video-status","playing",{timeout:60000});
  await page.screenshot({path:"test-results/grand-overview.png"});
  const deck=balconyFrame(inventory.blueprint)!;
  const view=cameraView(inventory.blueprint,"Balcony",inventory.seats,null,0);
  expect(view.position[1]).toBeCloseTo(deck.floor+1.65);
  expect(cameraObstructed(inventory.blueprint,inventory.seats,view.position)).toBe(false);
  await page.getByRole("button",{name:"Balcony",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-camera-moving","false");
  await expect.poll(async()=>Number((await canvas.getAttribute("data-camera-position"))!.split(",")[1])).toBeCloseTo(view.position[1],2);
  await page.screenshot({path:"test-results/grand-balcony.png"});
  // Use the real upper-level 2D map, then inspect its exact world-space eye.
  await page.getByRole("button",{name:"2D map",exact:true}).click();
  await page.getByRole("button",{name:"Balcony",exact:true}).last().click();
  const seatButton=page.locator(".map-seat:not(:disabled)").first();
  const id=(await seatButton.getAttribute("aria-label"))!.split(",")[0];
  await seatButton.click();
  await expect(seatButton).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"View from this seat",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-camera-moving","false");
  const seat=inventory.seats.find((s:any)=>s.id===id);
  expect(seat.level).toBe(1);
  await expect.poll(async()=>Number((await canvas.getAttribute("data-camera-position"))!.split(",")[1])).toBeCloseTo(seat.y+1.5,2);
  await page.screenshot({path:"test-results/grand-seat-preview.png"});
  await page.getByRole("button",{name:"Exit Preview",exact:true}).click();
  await expect(page.locator(".map-seat").filter({hasText:String(seat.number)}).first()).toBeVisible();
  await page.getByRole("button",{name:"3D view",exact:true}).click();
  await page.getByRole("button",{name:"Bird’s eye",exact:true}).click();
  await expect(canvas).toHaveAttribute("data-camera-moving","false");
  await expect(page.locator(".selected-seats-list")).toContainText(id);
  // Actual raycast click on an upper-level chair, with camera drag protection.
  const projection=await canvas.evaluate((el:any)=>el.movieverseDiagnostics().seatBacks);
  const candidate=inventory.seats.find((s:any)=>s.level===1&&s.id!==id&&!s.blocked&&inventory.inventory[s.id]?.status==="available"&&projection.some((p:any)=>p.id===s.id&&p.x>100&&p.x<950&&p.y>210&&p.y<825));
  expect(candidate, "An actual available upper-level chair must be in the overhead viewport").toBeTruthy();
  if(candidate){
    const point=projection.find((s:any)=>s.id===candidate.id);
    await page.mouse.click(point.x,point.y);
    await expect(page.locator(".selected-seats-list")).toContainText(candidate.id);
    await expect.poll(async()=>Number(await canvas.getAttribute("data-camera-fov"))).toBeGreaterThan(90);
  }
  await page.screenshot({path:"test-results/grand-birds-eye.png"});
  await page.getByRole("button",{name:"Tour",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"Auditorium tour stops"})).toBeVisible();
  await page.getByRole("button",{name:/Upper balcony/}).click();
  await page.screenshot({path:"test-results/grand-tour.png"});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator(".camera-presets").evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/grand-mobile.png"});
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole("button",{name:/Continue.*Add snacks/}).click();
  await expect(page).toHaveURL(/\/snacks$/);
});

test("native trailer clock, presented frames and GPU uploads advance during 30 seconds of camera movement",async({page})=>{
  test.setTimeout(180000);
  await page.addInitScript(()=>{
    (window as any).cinemaVideos=[];
    const create=document.createElement.bind(document);
    document.createElement=((tag:string,options?:ElementCreationOptions)=>{const el=create(tag,options);if(tag==="video")(window as any).cinemaVideos.push(el);return el;}) as typeof document.createElement;
  });
  await enterGrand(page);
  const canvas=page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-video-status","playing",{timeout:60000});
  const sample=()=>canvas.evaluate(el=>({media:JSON.parse(el.dataset.mediaTelemetry!),render:JSON.parse(el.dataset.renderTelemetry!),texture:el.dataset.videoTextureId,status:el.dataset.videoStatus}));
  await expect.poll(()=>canvas.getAttribute("data-media-telemetry")).toBeTruthy();
  await page.evaluate(()=>{const v=(window as any).cinemaVideos.findLast((v:HTMLVideoElement)=>v.src&&!v.isConnected);v.currentTime=0;});
  await page.waitForTimeout(700);
  const samples=[await sample()];
  const bounds=(await canvas.boundingBox())!;
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.48);await page.mouse.down();
  const until=Date.now()+30000;let i=0;
  while(Date.now()<until){
    await page.mouse.move(bounds.x+bounds.width*(.5+.06*Math.sin(i)),bounds.y+bounds.height*(.48+.025*Math.cos(i)),{steps:3});
    await page.waitForTimeout(400);samples.push(await sample());i++;
  }
  await page.mouse.up();
  await writeFile("test-results/grand-playback-motion.json",JSON.stringify(samples,null,2));
  const first=samples[0],last=samples.at(-1)!;
  expect(last.media.time-first.media.time).toBeGreaterThan(25);
  expect(last.media.presentedFrames-first.media.presentedFrames).toBeGreaterThan(10);
  expect(last.render.frames-first.render.frames).toBeGreaterThan(10);
  expect(last.render.uploadedVersion).toBeGreaterThan(first.render.uploadedVersion);
  for(const sample of samples){expect(sample.media.instance).toBe(first.media.instance);expect(sample.texture).toBe(first.texture);expect(sample.media.paused).toBe(false);}
  const additional:unknown[]=[];
  for(const amount of [120,-120,180,-180]){
    await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
    await page.mouse.wheel(0,amount);await page.waitForTimeout(400);
    additional.push({phase:"dolly",...await sample()});
  }
  await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
  await expect(page.locator(".selected-seats-list>div:not(.seat-row-leaving)")).toHaveCount(2);
  for(const name of ["Balcony","Overview","From stage","Bird\u2019s eye"]){
    await page.getByRole("button",{name,exact:true}).click();await expect(canvas).toHaveAttribute("data-camera-moving","false");
    additional.push({phase:name,...await sample()});
  }
  await writeFile("test-results/grand-playback-controls.json",JSON.stringify(additional,null,2));
  expect((await sample()).media.instance).toBe(first.media.instance);
  expect((await sample()).texture).toBe(first.texture);
});
