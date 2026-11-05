import {test,expect} from "@playwright/test";
import {writeFile,mkdir} from "node:fs/promises";
test("repeatable route performance sample",async({page})=>{
 test.setTimeout(180000);
 await page.setViewportSize({width:1440,height:900});
 await page.request.post("/api/register",{data:{name:"Performance Audit",email:`perf-${crypto.randomUUID()}@example.test`,password:"Cinema-Test-2026!"}});
 await page.addInitScript(()=>{
  (window as any).__perf={longTasks:0,longTaskMs:0,cls:0};
  try{new PerformanceObserver(list=>list.getEntries().forEach(entry=>{(window as any).__perf.longTasks++;(window as any).__perf.longTaskMs+=entry.duration;})).observe({type:"longtask",buffered:true});}catch{}
  try{new PerformanceObserver(list=>list.getEntries().forEach((entry:any)=>{if(!entry.hadRecentInput)(window as any).__perf.cls+=entry.value;})).observe({type:"layout-shift",buffered:true});}catch{}
 });
 const results=[];
 for(const route of ["/","/movies","/explore","/movies/coolie","/cinemas","/account","/watchlist"]){
  const api:string[]=[];const listener=(request:any)=>{if(request.url().includes("/api/"))api.push(new URL(request.url()).pathname+new URL(request.url()).search);};page.on("request",listener);
  const started=Date.now();await page.goto(route,{waitUntil:"domcontentloaded"});await expect(page.locator(".initial-loading")).toHaveCount(0,{timeout:30000});
  await page.waitForTimeout(2000);
  const cdp=await page.context().newCDPSession(page);await cdp.send("Performance.enable");const metrics=await cdp.send("Performance.getMetrics");await cdp.detach();
  const sample=await page.evaluate(async()=>{
   const frames:number[]=[];let previous=performance.now(),start=previous;
   await new Promise<void>(resolve=>{function tick(now:number){frames.push(now-previous);previous=now;if(now-start<1000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
   return {...(window as any).__perf,domNodes:document.querySelectorAll("*").length,scripts:performance.getEntriesByType("resource").filter((r:any)=>r.initiatorType==="script").length,frameP95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)],overflow:document.documentElement.scrollWidth>innerWidth};
  });
  results.push({route,observedMs:Date.now()-started,...sample,apiRequests:api,heapMb:Math.round((metrics.metrics.find(m=>m.name==="JSHeapUsedSize")?.value??0)/1048576)});page.off("request",listener);
 }
 await mkdir("outputs",{recursive:true});await writeFile(`outputs/performance-${process.env.PERF_LABEL||"before"}.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(({route,scripts,apiRequests,heapMb,longTasks,frameP95})=>({route,scripts,apiRequests:apiRequests.length,heapMb,longTasks,frameP95}))));
});
