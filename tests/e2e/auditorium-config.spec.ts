import {test,expect} from "@playwright/test";
for (const id of ["grand","classic","luxury","multiplex","large-format"]) {
 test(`${id}: configured geometry, map, camera and summary`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:1440,height:900});
  const catalog=await (await page.request.get("/api/catalog")).json();
  const venue=catalog.venues.find((v:any)=>v.blueprints[0]===id && v.movieIds.includes("sintel"));
  expect(venue).toBeTruthy();
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(Date.now()+2*86400000);
  const showId=[venue.id,"sintel",date,"1030"].join("~");
  const inventory=await (await page.request.get(`/api/inventory?show=${encodeURIComponent(showId)}`)).json();
  expect(inventory.blueprint.id).toBe(id);
  await page.goto(`/booking/${encodeURIComponent(showId)}/seats`);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button",{name:"Best 2 seats",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
  await expect(page.locator(".selected-seats-list>div")).toHaveCount(2);
  await page.getByRole("button",{name:"View from this seat",exact:true}).click();
  await expect(page.locator(".seat-view-return")).toBeVisible();
  await page.getByRole("button",{name:/Exit preview/i}).click();
  for(const name of ["From stage","Overview"]){
   await page.locator(".camera-presets").getByRole("button",{name,exact:true}).click();
   await expect(page.locator(".viewpoint-label")).toHaveText(name);
  }
  await page.waitForTimeout(1800);
  const diagnostics=await page.locator("canvas").evaluate((el:any)=>el.movieverseDiagnostics());
  expect(diagnostics.seats.length).toBe(inventory.seats.length);
  expect(diagnostics.calls).toBeLessThan(1000);
  await page.screenshot({path:`outputs/auditorium-${id}.png`});
  await page.getByRole("button",{name:"2D map",exact:true}).click();
  const ground=inventory.seats.filter((s:any)=>(s.level??(inventory.blueprint.balcony&&s.y>=(inventory.blueprint.rows-3)*inventory.blueprint.slope+2.3?1:0))===0);
  await expect(page.locator(".map-seat")).toHaveCount(ground.length);
  if(inventory.blueprint.balcony){
   await page.locator(".map-levels").getByRole("button",{name:"Balcony",exact:true}).click();
   await expect(page.locator(".map-seat")).toHaveCount(inventory.seats.length-ground.length);
   const available=page.locator(".map-seat:not(:disabled):not(.picked)").first();
   const title=await available.getAttribute("title");await available.click();await expect(page.locator(`.map-seat[title="${title}"]`)).toHaveAttribute("aria-pressed","true");
  }
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  const checkout=await page.locator(".sidebar-checkout").boundingBox();
  expect(checkout!.y+checkout!.height).toBeLessThanOrEqual(901);
 });
}

test("switching cinema discards previous seats and camera state",async({page})=>{
 const catalog=await (await page.request.get("/api/catalog")).json();
 const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(Date.now()+3*86400000);
 for(const id of ["multiplex","large-format"]){
  const venue=catalog.venues.find((v:any)=>v.blueprints[0]===id);
  await page.goto(`/booking/${encodeURIComponent([venue.id,"sintel",date,"1030"].join("~"))}/seats`);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".selected-seats-list>div")).toHaveCount(0);
  await expect(page.locator(".viewpoint-label")).toHaveText("OVERVIEW",{ignoreCase:true});
  await page.getByRole("button",{name:"Best 2 seats",exact:true}).click();
  await expect(page.locator(".selected-seats-list>div")).toHaveCount(2);
  await page.locator(".camera-presets").getByRole("button",{name:"From stage",exact:true}).click();
 }
});
