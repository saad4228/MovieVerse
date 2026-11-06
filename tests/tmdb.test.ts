import { afterEach, describe, expect, it, vi } from "vitest";
import { discoveryQuery, genreSchema, tmdbCatalog, tmdbRequest } from "../lib/tmdb";

afterEach(()=>vi.unstubAllGlobals());
const film = { id: 42, title: "Provider fixture film", original_title: "Original fixture", overview: "Provider overview", genre_ids: [18], release_date: "2026-11-05", poster_path: "/poster.jpg", original_language: "hi", vote_average: 7.8 };
function mockLists() {
  const fetcher = vi.fn(async (input: string)=>new URL(input).pathname.includes("genre/movie")
    ? Response.json({ genres: [{ id: 18, name: "Drama" }] })
    : Response.json({ page: Number(new URL(input).searchParams.get("page") || 1), total_pages: 3, results: [film, film] }));
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
describe("TMDB server integration (fixture responses, not live proof)",()=>{
  it("does not substitute bundled films when credentials are missing", async()=>{
    const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
    await expect(tmdbCatalog({}).list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_NOT_CONFIGURED",status:503});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses IN for now-playing, normalizes IDs, and coalesces metadata requests",async()=>{
    const fetcher=mockLists(); const provider=tmdbCatalog({TMDB_READ_TOKEN:"test-now-playing"});
    const query=discoveryQuery.parse({section:"now-playing",language:"hi-IN",page:2});
    const [result,again]=await Promise.all([provider.list(query),provider.list(query)]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const url=new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("region")).toBe("IN");
    expect(url.searchParams.get("language")).toBe("hi-IN");
    expect(url.searchParams.get("page")).toBe("2");
    expect(result.movies).toHaveLength(1);
    expect(result.movies[0]).toMatchObject({id:"tmdb-42",genre:["Drama"],formats:[],trailer:null});
    expect(result.fetchedAt).toBe(again.fetchedAt);
    expect(JSON.stringify(result)).not.toContain("test-now-playing");
  });
  it("labels global trending honestly and supports the weekly endpoint",async()=>{
    const fetcher=mockLists();
    const result=await tmdbCatalog({TMDB_READ_TOKEN:"test-weekly"}).list(discoveryQuery.parse({window:"week"}));
    const url=new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe("/3/trending/movie/week");
    expect(url.searchParams.has("region")).toBe(false);
    expect(result.scope).toBe("global-trending");
  });
  it("uses a server-only v3 API key when a read token is absent",async()=>{
    const fetcher=mockLists();
    const result=await tmdbCatalog({TMDB_API_KEY:"fixture-v3-key"}).list(discoveryQuery.parse({section:"upcoming"}));
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("api_key")).toBe("fixture-v3-key");
    expect(JSON.stringify(result)).not.toContain("fixture-v3-key");
  });
  it("does not cache failures or expose provider errors and secrets",async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response("secret provider diagnostic",{status:401})); vi.stubGlobal("fetch",fetcher);
    const provider=tmdbCatalog({TMDB_READ_TOKEN:"test-invalid"});
    await expect(provider.list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_AUTH_FAILED",status:503});
    await expect(provider.list(discoveryQuery.parse({}))).rejects.not.toHaveProperty("message","secret provider diagnostic");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("uses bearer authorization and reports sanitized upstream diagnostics", async () => {
    const token = ["test", "read", "value"].join("-");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status_code: 7,
      status_message: "Invalid API key: You do not have permissions to access the service.",
    }), { status: 401, headers: { "content-type": "application/json", "x-tmdb-request-id": "tmdb-request-1" } }));
    vi.stubGlobal("fetch", fetcher);
    const diagnostics: unknown[] = [];
    await expect(tmdbRequest("genre/movie/list", { language: "en-US" }, { TMDB_READ_TOKEN: token }, 0, (value) => genreSchema.safeParse(value).success, {
      stage: "protected-diagnostic",
      log: diagnostic => diagnostics.push(diagnostic),
    })).rejects.toMatchObject({ code: "TMDB_AUTH_FAILED", diagnostic: { upstreamStatus: 401, category: "authentication" } });
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${token}`);
    expect(JSON.stringify(diagnostics)).not.toContain(token);
    expect(diagnostics[0]).toMatchObject({ stage: "protected-diagnostic", tokenPresent: true, upstreamStatus: 401, requestId: "tmdb-request-1" });
  });
  it("respects upstream rate limiting without automatic request storms",async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response("",{status:429,headers:{"Retry-After":"40"}})); vi.stubGlobal("fetch",fetcher);
    const provider=tmdbCatalog({TMDB_READ_TOKEN:"test-rate-limit"});
    await expect(provider.list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_RATE_LIMITED",retryAfter:40});
    const count=fetcher.mock.calls.length;
    await expect(provider.list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_RATE_LIMITED"});
    expect(fetcher.mock.calls).toHaveLength(count);
  });
  it("rejects malformed pages and retries without retaining an invalid cached response",async()=>{
    const fetcher=vi.fn(async(input:string)=>new URL(input).pathname.includes("genre/movie")
      ? Response.json({genres:[]}) : Response.json({page:9,total_pages:10,results:[]}));
    vi.stubGlobal("fetch",fetcher);
    const provider=tmdbCatalog({TMDB_READ_TOKEN:"test-invalid-page"});
    await expect(provider.list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_INVALID_RESPONSE"});
    await expect(provider.list(discoveryQuery.parse({}))).rejects.toMatchObject({code:"TMDB_INVALID_RESPONSE"});
    expect(fetcher.mock.calls.filter(([input])=>!new URL(input).pathname.includes("genre/movie"))).toHaveLength(2);
  });
  it("loads details, Indian theatrical dates, cast, director, and official trailer together",async()=>{
    const fetcher=vi.fn().mockResolvedValue(Response.json({...film,
      credits:{cast:[{id:5,name:"Fixture performer",character:"Fixture role",profile_path:"/cast.jpg"}],crew:[{id:6,name:"Fixture director",job:"Director"}]},
      videos:{results:[{id:"trailer-1",key:"abcdefghijk",site:"YouTube",type:"Trailer",official:true}]},
      release_dates:{results:[{iso_3166_1:"IN",release_dates:[{type:3,release_date:"2026-11-06T00:00:00Z"}]}]},
    })); vi.stubGlobal("fetch",fetcher);
    const result=await tmdbCatalog({TMDB_READ_TOKEN:"test-detail"}).detail(42);
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("append_to_response")).toBe("credits,videos,images,release_dates");
    expect(result.movie.metadata?.cast[0]).toMatchObject({profilePath:"/cast.jpg",character:"Fixture role"});
    expect(result.movie.metadata?.crew[0].job).toBe("Director");
    expect(result.movie.metadata?.releaseDates[0].date).toBe("2026-11-06");
    expect(result.movie.trailers?.[0].url).toContain("abcdefghijk");
  });
  it("rejects unbounded pages and unsupported languages",()=>{
    expect(()=>discoveryQuery.parse({page:501})).toThrow();
    expect(()=>discoveryQuery.parse({language:"invalid"})).toThrow();
  });
});
