import {test,expect} from '@playwright/test';

test('automatic conveyor keeps constant speed, freezes in place and crosses the catalogue boundary',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const carousel=page.locator('.cinematic-panorama');
 const count=Number(await carousel.getAttribute('data-movie-count'));
 for(let i=3;i<count-1;i++)await page.getByRole('button',{name:'Next movie',exact:true}).click();
 await expect(carousel).toHaveAttribute('data-position',`${count-1}.0000`);
 await page.emulateMedia({reducedMotion:'no-preference'});
 const fixed=new Date();await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+60000));
 await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 const step=Number(await carousel.getAttribute('data-poster-step'));
 const position=async()=>Number(await carousel.getAttribute('data-position'));
 await page.clock.runFor(1000);const first=await position();
 await page.clock.runFor(1000);const second=await position();
 expect((second-first)*step).toBeGreaterThan(30.5);
 expect((second-first)*step).toBeLessThan(33);
 const centreBefore=await carousel.locator('.current').getAttribute('data-carousel-index');
 const travelMs=Math.ceil((count+.2-second)*step/32*1000);
 await page.clock.runFor(travelMs);
 expect(await position()).toBeGreaterThan(count);
 expect(await carousel.getAttribute('data-active-movie')).toBe(await carousel.locator('.current a').getAttribute('href').then(href=>href!.split('/').pop()));
 expect(await carousel.locator('.panorama-screen').count()).toBe(9);
 // A real panel survives the last/first boundary without a reset or jump.
 const sampleIndex=Number(centreBefore)+1;
 const transformBefore=await carousel.locator(`[data-carousel-index="${sampleIndex}"]`).evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
 const before=await position();await page.clock.runFor(100);
 const transformAfter=await carousel.locator(`[data-carousel-index="${sampleIndex}"]`).evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
 expect(await position()).toBeGreaterThan(before);expect(Math.abs(transformAfter-transformBefore)).toBeLessThan(5);
 await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 const stopped=await position();await page.clock.runFor(2500);expect(await position()).toBe(stopped);
 for(let i=0;i<3;i++){
  await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
  const begin=await position();await page.clock.runFor(1000);
  expect(((await position())-begin)*step).toBeGreaterThan(30.5);
  expect(((await position())-begin)*step).toBeLessThan(33);
  await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 }
 await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 const beforeHidden=await position();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 await page.clock.runFor(3000);expect(await position()).toBe(beforeHidden);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});
 await page.clock.runFor(1000);
 expect(((await position())-beforeHidden)*step).toBeGreaterThan(30.5);
 expect(((await position())-beforeHidden)*step).toBeLessThan(33);
 await page.emulateMedia({reducedMotion:'reduce'});
 const reducedPosition=await position();await page.clock.runFor(1000);expect(await position()).toBe(reducedPosition);
 await expect(page.locator('.panorama-autoplay')).toBeDisabled();
 await page.clock.resume();
 expect(errors).toEqual([]);
});

test('manual controls resume autoplay and the active movie still opens',async({page})=>{
 await page.goto('/');const carousel=page.locator('.cinematic-panorama');
 await expect(carousel).toHaveAttribute('data-position','3.0000');
 const fixed=new Date();await page.clock.install({time:fixed});await page.clock.pauseAt(new Date(fixed.getTime()+60000));
 await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 await page.clock.runFor(300);
 await page.getByRole('button',{name:'Next movie',exact:true}).evaluate((el:HTMLButtonElement)=>el.click());
 await page.clock.runFor(16);
 const target=Number(await carousel.getAttribute('data-target'));
 await page.clock.runFor(1100);
 expect(Number(await carousel.getAttribute('data-position'))).toBeCloseTo(target,2);
 await page.clock.runFor(1500);
 expect(Number(await carousel.getAttribute('data-position'))).toBeGreaterThan(target+.1);
 await page.locator('.panorama-autoplay').evaluate((el:HTMLButtonElement)=>el.click());
 await page.getByRole('button',{name:'Previous movie',exact:true}).evaluate((el:HTMLButtonElement)=>el.click());
 await page.clock.runFor(16);
 const final=Number(await carousel.getAttribute('data-target'));
 await page.clock.runFor(1200);
 expect(Number(await carousel.getAttribute('data-position'))).toBe(final);
 await page.clock.resume();
 const href=await carousel.locator('.current a').getAttribute('href');
 await carousel.locator('.current a').click();await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('mouse dragging and touch swiping preserve the conveyor position',async({page})=>{
 await page.goto('/');const carousel=page.locator('.cinematic-panorama');await expect(carousel).toBeVisible();
 await page.getByRole('button',{name:'Start automatic rotation',exact:true}).click();
 let box=(await carousel.boundingBox())!;
 const before=Number(await carousel.getAttribute('data-position'));
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.4);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.5-230,box.y+box.height*.4,{steps:15});await page.mouse.up();
 await expect.poll(async()=>Number(await carousel.getAttribute('data-position'))).toBeGreaterThan(before+.5);
 await page.getByRole('button',{name:'Pause automatic rotation',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Start automatic rotation',exact:true}).click();
 box=(await carousel.boundingBox())!;
 const touchBefore=Number(await carousel.getAttribute('data-position'));
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:280,y:box.y+box.height*.4}]});
 for(const x of [250,220,180,140,100])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:box.y+box.height*.4}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(async()=>Number(await carousel.getAttribute('data-position'))).toBeGreaterThan(touchBefore+.5);
 const after=Number(await carousel.getAttribute('data-position'));
 await expect.poll(async()=>Number(await carousel.getAttribute('data-position')),{timeout:5000}).toBeGreaterThan(after+.15);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await cdp.detach();
});

test('record actual browser frame cadence during continuous rotation',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start automatic rotation',exact:true}).click();
 const metrics=await page.evaluate(()=>new Promise(resolve=>{
  const frames:number[]=[];const start=performance.now();let last=start;
  const frame=(now:number)=>{frames.push(now-last);last=now;if(now-start<2500)requestAnimationFrame(frame);else resolve({fps:frames.length*1000/(now-start),p95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)]});};requestAnimationFrame(frame);
 }));
 console.log({carouselFrameCadence:metrics});
 const {writeFile}=await import('node:fs/promises');await writeFile('outputs/carousel-autoplay-performance.json',JSON.stringify(metrics));
 await page.screenshot({path:'outputs/carousel-autoplay.png'});
});
