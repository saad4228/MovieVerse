import { afterEach, describe, expect, it, vi } from "vitest";
import { genreCollections, genreMovies, genreQuery } from "../lib/genre-catalog";
afterEach(()=>vi.unstubAllGlobals());
const genres=[{id:901,name:"Action"},{id:902,name:"Science Fiction"},{id:903,name:"Crime"},{id:904,name:"Mystery"}];
const movie={id:42,title:"Fixture film",original_language:"hi",genre_ids:[901,902],release_date:"2020-01-01",vote_average:8};
function mock(token:string, result=[movie]) {
  const requests:URL[]=[];
  vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
    const url=new URL(input); requests.push(url);
    if(url.pathname.endsWith("genre/movie/list"))return Response.json({genres});
    if(url.pathname.endsWith("movie/42"))return Response.json({...movie,origin_country:["IN"]});
    return Response.json({page:Number(url.searchParams.get("page")||1),total_pages:10,results:result});
  }));
  return {settings:{TMDB_READ_TOKEN:token},requests};
}
describe("genre discovery (fixture provider, not live catalogue proof)",()=>{
  it("requires credentials instead of fabricating a catalogue",async()=>{
    await expect(genreCollections({})).rejects.toMatchObject({code:"TMDB_NOT_CONFIGURED"});
  });
  it("resolves provider genre IDs and preserves multi-genre membership",async()=>{
    const {settings,requests}=mock("genre-dynamic");
    const collections=await genreCollections(settings);
    expect(collections.find(g=>g.slug==="crime-mystery")?.ids).toEqual([903,904]);
    const action=await genreMovies(genreQuery.parse({genre:"action",preview:"true"}),settings);
    const sci=await genreMovies(genreQuery.parse({genre:"science-fiction"}),settings);
    expect(action.movies).toHaveLength(1);
    expect(action.movies[0].id).toBe(sci.movies[0].id);
    expect(action.movies[0].providerGenreIds).toEqual([901,902]);
    expect(JSON.stringify(action)).not.toContain("genre-dynamic");
    expect(requests.filter(u=>u.pathname.endsWith("genre/movie/list"))).toHaveLength(1);
    expect(requests.some(u=>u.searchParams.get("with_origin_country")==="IN")).toBe(true);
  });
  it("passes independent language, country, year and pagination filters",async()=>{
    const {settings,requests}=mock("genre-filters");
    await genreMovies(genreQuery.parse({genre:"action",language:"hi",country:"IN",year:2020,page:3,sort:"rated"}),settings);
    const url=requests.at(-1)!;
    expect(Object.fromEntries(url.searchParams)).toMatchObject({with_genres:"901",with_original_language:"hi",with_origin_country:"IN",primary_release_year:"2020",page:"3",sort_by:"vote_average.desc"});
  });
  it("verifies country for search candidates rather than guessing from language",async()=>{
    const {settings,requests}=mock("genre-search");
    const other=await genreMovies(genreQuery.parse({genre:"action",q:"Fixture",country:"US",language:"hi"}),settings);
    expect(other.movies).toHaveLength(0);
    expect(requests.some(u=>u.pathname.endsWith("movie/42"))).toBe(true);
    const result=await genreMovies(genreQuery.parse({genre:"action",q:"Fixture",country:"IN",language:"hi"}),settings);
    expect(result.movies).toHaveLength(1);
    expect(result.searchFiltered).toBe(true);
  });
  it("excludes adult and wrong-genre results, coalesces requests and rejects invalid filters",async()=>{
    const {settings,requests}=mock("genre-validation",[movie,{...movie,id:43,adult:true},{...movie,id:44,genre_ids:[999]}] as typeof movie[]);
    const query=genreQuery.parse({genre:"action"});
    const [a,b]=await Promise.all([genreMovies(query,settings),genreMovies(query,settings)]);
    expect(a.movies).toHaveLength(1); expect(b.movies[0].id).toBe(a.movies[0].id);
    expect(requests).toHaveLength(2);
    expect(()=>genreQuery.parse({genre:"action",page:501})).toThrow();
    expect(()=>genreQuery.parse({genre:"action",country:"India"})).toThrow();
    await expect(genreMovies(genreQuery.parse({genre:"unknown"}),settings)).rejects.toMatchObject({status:404});
  });
});
