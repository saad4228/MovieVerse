import {test,expect} from '@playwright/test';
test('navigation can supersede an RSC response whose body is still streaming',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const nativeFetch=window.fetch;
  window.fetch=async(input,init)=>{
   const response=await nativeFetch(input,init);
   if(!String(input).includes('navigation-stream-test')||!response.headers.get('content-type')?.includes('text/x-component')||!init?.signal)return response;
   const signal=init.signal;
   const reader=response.body!.getReader();
   window.slowNavigationAborted=false;
   let firstChunk=true;
   const body=new ReadableStream({
    start(controller){
     signal.addEventListener('abort',()=>{window.slowNavigationAborted=true;controller.error(signal.reason)},{once:true});
    },
    async pull(controller){
     if(firstChunk){firstChunk=false;await new Promise(resolve=>setTimeout(resolve,1500));}
     try{const chunk=await reader.read();if(chunk.done)controller.close();else controller.enqueue(chunk.value)}catch(e){controller.error(e)}
    },
    cancel:reason=>reader.cancel(reason)
   });
   const nativeTee=body.tee.bind(body);
   body.tee=()=>{window.decoderStarted=true;return nativeTee()};
   const wrapped=new Response(body,{status:response.status,headers:response.headers});
   Object.defineProperty(wrapped,"url",{value:response.url});
   return wrapped;
  };
 });
 await page.goto('/movies');await expect(page.getByLabel('Search cinema movies')).toBeVisible();
 await page.evaluate(()=>{
  const runtime=window[Symbol.for('vinext.navigationRuntime')];
  runtime.functions.clearNavigationCaches();
  void runtime.functions.navigate('/cinemas?navigation-stream-test=1',0,'navigate','push');
 });
 await page.waitForFunction(()=>window.decoderStarted===true);
 await page.evaluate(()=>{void window[Symbol.for('vinext.navigationRuntime')].functions.navigate('/my-tickets?navigation-test=2',0,'navigate','push')});
 await expect(page).toHaveURL(/\/my-tickets/);
 await page.waitForTimeout(2500);
 await expect(page).toHaveURL(/\/my-tickets/);
 expect(await page.evaluate(()=>window.slowNavigationAborted)).toBe(false);
 expect(errors).toEqual([]);
});

test('a superseded request is still cancelled before decoder handoff',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const nativeFetch=window.fetch;
  window.fetch=async(input,init)=>{
   if(!String(input).includes('pending-navigation-test')||!init?.signal)return nativeFetch(input,init);
   window.pendingNavigationStarted=true;
   return new Promise<Response>((resolve,reject)=>{
    init.signal!.addEventListener('abort',()=>{
     window.pendingNavigationAborted=true;
     reject(init.signal!.reason);
    },{once:true});
   });
  };
 });
 await page.goto('/movies');await expect(page.getByLabel('Search cinema movies')).toBeVisible();
 await page.evaluate(()=>{
  const runtime=window[Symbol.for('vinext.navigationRuntime')];
  runtime.functions.clearNavigationCaches();
  void runtime.functions.navigate('/cinemas?pending-navigation-test=1',0,'navigate','push');
 });
 await page.waitForFunction(()=>window.pendingNavigationStarted===true);
 await page.evaluate(()=>{void window[Symbol.for('vinext.navigationRuntime')].functions.navigate('/my-tickets?navigation-test=3',0,'navigate','push')});
 await expect(page).toHaveURL(/\/my-tickets/);
 expect(await page.evaluate(()=>window.pendingNavigationAborted)).toBe(true);
 expect(errors).toEqual([]);
});
