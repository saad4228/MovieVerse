import {afterEach,describe,it,expect,vi} from "vitest";
import {discoveryDb} from "./helpers/discovery-db";
import {syncCatalogue,publishCollection,qualifies} from "../lib/catalogue-sync";
import {cataloguePage,databaseGenrePage,balancedFeatured} from "../lib/catalogue-read";
import {collectionPlan,indiaToday} from "../lib/discovery-collections";
import {normalizeMovie} from "../lib/tmdb";
import {catalogueApi} from "../lib/catalogue-api";
const settings={TMDB_READ_TOKEN:"test-only-discovery-token"};
const raw=(id:number)=>({id,title:`Film ${id}`,origin_country:[id===2?"IN":"US"],original_language:id===2?"ta":"en",release_date:"1995-01-01",genres:[{id:28,name:"Action"},{id:53,name:"Thriller"}],vote_count:1000,vote_average:8,popularity:100,poster_path:"/poster.jpg",backdrop_path:"/backdrop.jpg",release_dates:{results:[{iso_3166_1:"IN",release_dates:[{type:3,release_date:"1995-01-01T00:00:00Z"}]}]}});
let ids=[1,2],broken=false;
function provider(){vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
 const url=new URL(input),page=Number(url.searchParams.get("page"));
 if(url.pathname.endsWith("genre/movie/list"))return Response.json({genres:[{id:28,name:"Action"},{id:53,name:"Thriller"}]});
 if(/\/movie\/\d+$/.test(url.pathname))return Response.json(raw(Number(url.pathname.split("/").pop())));
 if(broken&&url.pathname.includes("trending/movie/day")&&page===2)return Response.json({error:"temporary"},{status:500});
 return Response.json({page,total_pages:broken&&url.pathname.includes("trending/movie/day")?3:1,total_results:ids.length,results:ids.map(raw)});
}));}
afterEach(()=>{vi.unstubAllGlobals();ids=[1,2];broken=false;});
describe("persistent catalogue generations",()=>{
 it("releases the lease if creating the sync run fails",async()=>{
  const {db,sqlite}=discoveryDb();
  sqlite.exec("CREATE TRIGGER fail_run BEFORE INSERT ON discovery_sync_runs BEGIN SELECT RAISE(FAIL, 'run write failed'); END");
  await expect(syncCatalogue(db,settings,"trending")).rejects.toThrow("run write failed");
  expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_sync_lock").get()?.n).toBe(0);
  sqlite.close();
 });
 it("rolls back publication if pruning old memberships fails",async()=>{
  const {db,sqlite}=discoveryDb();provider();await syncCatalogue(db,settings,"trending");
  const before=sqlite.prepare("SELECT generation FROM discovery_collections WHERE id='trending-day'").get()?.generation;
  sqlite.exec("CREATE TRIGGER fail_prune BEFORE DELETE ON discovery_memberships BEGIN SELECT RAISE(FAIL, 'prune failed'); END");
  const movie=normalizeMovie(raw(1),new Map(),new Date().toISOString());
  await expect(publishCollection(db,{id:"trending-day",path:"",params:{},pages:1},[movie],"new-generation")).rejects.toThrow("prune failed");
  expect(sqlite.prepare("SELECT generation FROM discovery_collections WHERE id='trending-day'").get()?.generation).toBe(before);
  expect((await cataloguePage(db,new URLSearchParams({collection:"trending-day"}))).totalResults).toBe(2);
  sqlite.close();
 });
 it("waits for remaining detail requests before releasing a failed sync lease",async()=>{
  const {db,sqlite}=discoveryDb();
  let started!:()=>void,finish!:()=>void;
  const detailStarted=new Promise<void>(resolve=>{started=resolve;});
  const delayed=new Promise<void>(resolve=>{finish=resolve;});
  vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
   const path=new URL(input).pathname;
   if(path.endsWith("genre/movie/list"))return Response.json({genres:[]});
   if(path.endsWith("movie/1"))return Response.json({status_message:"unauthorized"},{status:401});
   if(path.endsWith("movie/2")){started();await delayed;return Response.json(raw(2));}
   return Response.json({page:1,total_pages:1,total_results:2,results:[raw(1),raw(2)]});
  }));
  const run=syncCatalogue(db,settings,"trending");
  const failure=expect(run).rejects.toThrow();
  await detailStarted;
  await new Promise(resolve=>setTimeout(resolve,10));
  expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_sync_lock").get()?.n).toBe(1);
  finish();await failure;
  expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_sync_lock").get()?.n).toBe(0);
  sqlite.close();
 });
 it("keeps recent releases and future regional collections separate without duplicating records",async()=>{
  const {db,sqlite}=discoveryDb();provider();await syncCatalogue(db,settings,"trending");
  const today=indiaToday();
  sqlite.prepare("UPDATE discovery_movies SET india_release=?,language='hi',origins='[\"IN\"]' WHERE id=1").run(today);
  sqlite.prepare("UPDATE discovery_movies SET india_release='2099-01-01',language='ta',origins='[\"IN\"]' WHERE id=2").run();
  const movies=(await cataloguePage(db,new URLSearchParams())).movies;
  await publishCollection(db,{id:"upcoming-IN",path:"",params:{},pages:1},movies,"upcoming-test");
  expect((await cataloguePage(db,new URLSearchParams({collection:"recent-hi"}))).totalResults).toBe(1);
  expect((await cataloguePage(db,new URLSearchParams({collection:"recent-ta"}))).totalResults).toBe(0);
  expect((await cataloguePage(db,new URLSearchParams({collection:"upcoming-language-ta"}))).movies.map(m=>m.id)).toEqual(["tmdb-2"]);
  expect((await cataloguePage(db,new URLSearchParams({collection:"upcoming-language-hi"}))).totalResults).toBe(0);
  expect((await cataloguePage(db,new URLSearchParams())).totalResults).toBe(2);sqlite.close();
 });
 it("imports new records, replaces memberships and retains older films in All Movies",async()=>{
  const {db,sqlite}=discoveryDb();provider();
  await syncCatalogue(db,settings,"trending");ids=[2,3];
  const result=await syncCatalogue(db,settings,"trending");
  expect(result.failures).toBe(0);expect(result.collections["trending-day"].removed).toBe(1);
  const trending=await cataloguePage(db,new URLSearchParams({collection:"trending-day"}));
  expect(trending.movies.map(m=>m.id).sort()).toEqual(["tmdb-2","tmdb-3"]);
  expect((await cataloguePage(db,new URLSearchParams())).totalResults).toBe(3);
  expect((await cataloguePage(db,new URLSearchParams({collection:"hollywood"}))).totalResults).toBe(2);
  for(const genre of ["action","thriller"]){const page=await databaseGenrePage(db,{genre,page:1,sort:"popular",q:"",preview:"false"});expect(page.movies).toHaveLength(3);}
  sqlite.close();
 });
 it("does not remove a working collection when a later provider page fails",async()=>{
  const {db,sqlite}=discoveryDb();provider();await syncCatalogue(db,settings,"trending");broken=true;ids=[3];
  const result=await syncCatalogue(db,settings,"trending");expect(result.failures).toBe(1);
  expect((await cataloguePage(db,new URLSearchParams({collection:"trending-day"}))).movies.map(m=>m.id).sort()).toEqual(["tmdb-1","tmdb-2"]);
  expect(sqlite.prepare("SELECT status FROM discovery_sync_runs WHERE id=?").get(result.id)?.status).toBe("partial");sqlite.close();
 });
 it("a failed staging write cannot replace the published generation",async()=>{
  const {db,sqlite}=discoveryDb();provider();await syncCatalogue(db,settings,"trending");
  const badDb={...db,batch:async()=>{throw new Error("D1 failure");}} as unknown as D1Database;
  await expect(publishCollection(badDb,{id:"trending-day",path:"",params:{},pages:1},[normalizeMovie(raw(1),new Map(),new Date().toISOString())],"failed")).rejects.toThrow();
  expect((await cataloguePage(db,new URLSearchParams({collection:"trending-day"}))).totalResults).toBe(2);sqlite.close();
 });
 it("removes passed upcoming dates at read time and restores postponed dates",async()=>{
  const {db,sqlite}=discoveryDb();provider();await syncCatalogue(db,settings,"trending");
  const movie=normalizeMovie(raw(1),new Map(),new Date().toISOString());
  await publishCollection(db,{id:"upcoming-IN",path:"",params:{},pages:1},[movie],"future");
  expect((await cataloguePage(db,new URLSearchParams({collection:"upcoming"}))).totalResults).toBe(0);
  sqlite.prepare("UPDATE discovery_movies SET india_release='2099-01-01' WHERE id=1").run();
  expect((await cataloguePage(db,new URLSearchParams({collection:"upcoming"}))).totalResults).toBe(1);
  expect((await cataloguePage(db,new URLSearchParams())).totalResults).toBe(2);sqlite.close();
 });
 it("blocks public sync, status and pin mutation and refuses concurrent imports",async()=>{
  const {db,sqlite}=discoveryDb();
  for(const action of ["catalogue-sync","catalogue-status","catalogue-pins"]){const response=await catalogueApi(new Request(`https://movieverse.test/api/${action}`),action,{DB:db,ADMIN_TOKEN:"test-only-admin"});expect(response?.status).toBe(403);}
  await db.prepare("INSERT INTO discovery_sync_lock VALUES(1,'other',?)").bind(Date.now()+60000).run();
  await expect(syncCatalogue(db,settings,"full")).rejects.toThrow("already running");sqlite.close();
 });
 it("distinguishes regional theatrical dates, US origin and English language",()=>{
  const movie=normalizeMovie({...raw(3),origin_country:["GB"],production_countries:[{iso_3166_1:"GB",name:"United Kingdom"}]},new Map(),new Date().toISOString());
  const plan=collectionPlan("full"),hollywood=plan.find(p=>p.id==="hollywood")!,upcoming=plan.find(p=>p.id==="upcoming-IN")!;
  expect(qualifies(movie,hollywood,indiaToday())).toBe(false);
  movie.release="2099-01-01";expect(qualifies(movie,upcoming,indiaToday())).toBe(false);
  expect(plan.find(p=>p.id==="upcoming-IN")?.params.with_release_type).toBe("2|3");
  expect(collectionPlan("trending")).toHaveLength(2);
 });
 it("features actual films from multiple origin collections without duplicates",()=>{
  const movies=[1,2,3].map(id=>normalizeMovie(raw(id),new Map(),new Date().toISOString()));
  const featured=balancedFeatured([[movies[0]],[movies[1]],[movies[0],movies[2]]]);
  expect(featured).toHaveLength(3);expect(new Set(featured.flatMap(m=>m.originCountries??[]))).toEqual(new Set(["IN","US"]));
 });
});
