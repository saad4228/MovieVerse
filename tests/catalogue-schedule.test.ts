import {expect,it,vi} from "vitest";
vi.mock("vinext/server/fetch-handler",()=>({default:{fetch:vi.fn()}}));
vi.mock("../lib/catalogue-sync",()=>({syncCatalogue:vi.fn(async()=>({id:"test-scheduled",kind:"full",failures:0}))}));
import worker from "../worker/index";
import {syncCatalogue} from "../lib/catalogue-sync";
it("routes daily and six-hour schedules to the correct sync with the backend bindings",async()=>{
 const db={} as D1Database,env={DB:db,TMDB_READ_TOKEN:"test-only-scheduled-token"},waitUntil=vi.fn();
 const log=vi.spyOn(console,"log").mockImplementation(()=>{});
 for(const [cron,kind] of [["0 3 * * *","full"],["0 */6 * * *","trending"]]){
  await worker.scheduled({cron} as ScheduledController,env,{waitUntil} as unknown as ExecutionContext);
  expect(syncCatalogue).toHaveBeenLastCalledWith(db,env,kind,expect.objectContaining({diagnostics:expect.any(Function)}));
  await waitUntil.mock.calls.at(-1)![0];
 }
 log.mockRestore();
});
it("does not report scheduled success without a database binding",async()=>{
 await expect(worker.scheduled({cron:"0 3 * * *"} as ScheduledController,{},{} as ExecutionContext)).rejects.toThrow("DB binding");
});
