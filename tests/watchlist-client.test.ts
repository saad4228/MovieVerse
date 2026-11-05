import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {useWatchlist} from "../lib/watchlist-client";
import {watchlistKey} from "../lib/watchlist-key";
import {movies} from "../lib/catalog";
const movie=movies[0],key=watchlistKey(movie),entry={key,movie,added:Date.now(),nowPlaying:false};
let fetcher:ReturnType<typeof vi.fn>;
function deferred(){let resolve!:(value:Response)=>void;const promise=new Promise<Response>(r=>resolve=r);return{promise,resolve};}
beforeEach(async()=>{vi.stubGlobal("window",new EventTarget());fetcher=vi.fn().mockResolvedValueOnce(Response.json({userId:"a",entries:[]}));vi.stubGlobal("fetch",fetcher);await useWatchlist.getState().load(true);});
afterEach(()=>vi.unstubAllGlobals());
it("does not expose an old account's in-flight save after switching accounts",async()=>{
 const pending=deferred();fetcher.mockReturnValueOnce(pending.promise);
 const mutation=useWatchlist.getState().toggle(movie);expect(useWatchlist.getState().entries[key]).toBeDefined();
 fetcher.mockResolvedValueOnce(Response.json({userId:"b",entries:[]}));await useWatchlist.getState().load(true);
 pending.resolve(Response.json({userId:"a",key,saved:true,entry}));await mutation;
 expect(useWatchlist.getState().userId).toBe("b");expect(useWatchlist.getState().entries).toEqual({});expect(useWatchlist.getState().pending).toEqual({});
});
it("rolls back an optimistic save on an actual rejected response",async()=>{
 fetcher.mockResolvedValueOnce(Response.json({error:"Temporarily unavailable"},{status:503}));await useWatchlist.getState().toggle(movie);
 expect(useWatchlist.getState().entries[key]).toBeUndefined();expect(useWatchlist.getState().pending[key]).toBeUndefined();expect(useWatchlist.getState().error).toBe("Temporarily unavailable");
});
it("coalesces rapid actions and ignores a stale refresh that predates a successful save",async()=>{
 const pending=deferred();fetcher.mockReturnValueOnce(pending.promise);
 const first=useWatchlist.getState().toggle(movie);await useWatchlist.getState().toggle(movie);expect(fetcher).toHaveBeenCalledTimes(2);
 const stale=deferred();fetcher.mockReturnValueOnce(stale.promise);const refresh=useWatchlist.getState().load();
 pending.resolve(Response.json({userId:"a",key,saved:true,entry}));await first;
 stale.resolve(Response.json({userId:"a",entries:[]}));await refresh;expect(useWatchlist.getState().entries[key]).toBeDefined();
});
