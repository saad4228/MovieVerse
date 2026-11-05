import {afterEach,expect,it,vi} from "vitest";
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.resetModules();});
it("shares one refresh clock, skips hidden documents, and removes it on final unsubscribe",async()=>{
 vi.useFakeTimers();const windowTarget=new EventTarget(),documentTarget=Object.assign(new EventTarget(),{hidden:false});
 vi.stubGlobal("window",windowTarget);vi.stubGlobal("document",documentTarget);
 const {subscribeVisibleRefresh}=await import("../lib/visible-refresh");
 const a=vi.fn(),b=vi.fn(),stopA=subscribeVisibleRefresh(a),stopB=subscribeVisibleRefresh(b);
 expect(vi.getTimerCount()).toBe(1);vi.advanceTimersByTime(300000);expect(a).toHaveBeenCalledTimes(1);expect(b).toHaveBeenCalledTimes(1);
 documentTarget.hidden=true;windowTarget.dispatchEvent(new Event("focus"));vi.advanceTimersByTime(300000);expect(a).toHaveBeenCalledTimes(1);
 documentTarget.hidden=false;documentTarget.dispatchEvent(new Event("visibilitychange"));expect(a).toHaveBeenCalledTimes(2);
 stopA();windowTarget.dispatchEvent(new Event("focus"));expect(a).toHaveBeenCalledTimes(2);expect(b).toHaveBeenCalledTimes(3);
 stopB();expect(vi.getTimerCount()).toBe(0);windowTarget.dispatchEvent(new Event("focus"));expect(b).toHaveBeenCalledTimes(3);
});
