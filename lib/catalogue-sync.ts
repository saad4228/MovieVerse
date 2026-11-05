import {tmdbRequest,movieSchema,pageSchema,genreSchema,normalizeMovie,TmdbError,type TmdbSettings} from "./tmdb";
import {collectionPlan,indiaToday,type CollectionSpec} from "./discovery-collections";
import type {Movie} from "./catalog";
export type SyncReport={collections:Record<string,{count?:number;removed?:number;error?:string}>;imported:number;updated:number;failures:number};
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(path:string,params:Record<string,string>,settings:TmdbSettings,validate:(x:unknown)=>boolean){
 for(let attempt=0;;attempt++)try{return await tmdbRequest(path,params,settings,0,validate);}catch(error){
  if(attempt>=2||error instanceof TmdbError&&["TMDB_AUTH_FAILED","TMDB_NOT_CONFIGURED","TMDB_INVALID_RESPONSE","TMDB_NOT_FOUND"].includes(error.code))throw error;
  await wait(error instanceof TmdbError&&error.retryAfter?Math.min(30000,error.retryAfter*1000):500*2**attempt);
 }
}
export function theatricalDate(movie:Movie,region:string){return movie.metadata?.releaseDates.find(r=>r.region===region&&r.date&&r.status!=="unconfirmed")?.date??null;}
export function qualifies(movie:Movie,spec:CollectionSpec,today:string){
 const origins=movie.originCountries?.length?movie.originCountries:movie.productionCountries??[];
 if(spec.params.with_origin_country&&!origins.includes(spec.params.with_origin_country))return false;
 if(spec.id==="upcoming-IN"||spec.id==="upcoming-US"){
  const date=theatricalDate(movie,spec.id.endsWith("IN")?"IN":"US");return !!date&&date>today&&date<=spec.params["release_date.lte"];
 }
 if(spec.id==="upcoming-global")return !!movie.release&&movie.release>today&&movie.release<=spec.params["primary_release_date.lte"];
 // The provider's current IN list is discovery, not proof of city inventory.
 if(spec.id==="now-playing-IN"){const date=theatricalDate(movie,"IN");return !!date&&date<=today;}
 return true;
}
export async function publishCollection(db:D1Database,spec:CollectionSpec,movies:Movie[],generation:string,now=Date.now()){
 const previous=await db.prepare("SELECT count(*) AS n FROM discovery_memberships m JOIN discovery_collections c ON c.id=m.collection AND c.generation=m.generation WHERE m.collection=? AND m.movie_id NOT IN (SELECT value FROM json_each(?))").bind(spec.id,JSON.stringify(movies.map(m=>m.metadata!.tmdbId))).first<{n:number}>();
 // Stage a complete generation. Readers keep the old generation until the final pointer swap.
 for(let i=0;i<movies.length;i+=40)await db.batch(movies.slice(i,i+40).map((movie,index)=>db.prepare("INSERT OR REPLACE INTO discovery_memberships(collection,generation,movie_id,rank,last_seen) VALUES(?,?,?,?,?)").bind(spec.id,generation,movie.metadata!.tmdbId,i+index,now)));
 await db.prepare("INSERT INTO discovery_collections(id,generation,last_success,last_attempt,error) VALUES(?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,last_success=excluded.last_success,last_attempt=excluded.last_attempt,error=NULL").bind(spec.id,generation,now,now).run();
 await db.prepare("DELETE FROM discovery_memberships WHERE collection=? AND generation<>?").bind(spec.id,generation).run();
 return {count:movies.length,removed:previous?.n??0};
}
export async function syncCatalogue(db:D1Database,settings:TmdbSettings,kind:"full"|"trending",options:{now?:Date;progress?:(text:string)=>void;collection?:string}={}){
 const now=options.now??new Date(),started=Date.now(),runId=crypto.randomUUID();
 const lock=await db.prepare("INSERT INTO discovery_sync_lock(id,owner,expires) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE discovery_sync_lock.expires<?").bind(runId,started+20*60_000,started).run();
 if(!lock.meta.changes)throw new Error("A catalogue synchronisation is already running.");
 const report:SyncReport={collections:{},imported:0,updated:0,failures:0};
 await db.prepare("INSERT INTO discovery_sync_runs(id,kind,started,status) VALUES(?,?,?,'running')").bind(runId,options.collection?`manual:${options.collection}`:kind,started).run();
 try{
  const genreResult=await request("genre/movie/list",{language:"en-US"},settings,x=>genreSchema.safeParse(x).success);
  const genres=new Map(genreSchema.parse(genreResult.data).genres.map(g=>[g.id,g.name]));
  const known=new Map<number,Movie>();
  for(const spec of collectionPlan(kind,now).filter(s=>!options.collection||s.id===options.collection)){
   try{
    options.progress?.(`Refreshing ${spec.id}`);
    const ids=new Set<number>();let totalPages:number|undefined;
    for(let page=1;page<=Math.min(spec.pages,totalPages??spec.pages);page++){
     const result=await request(spec.path,{language:"en-US",...spec.params,page:String(page)},settings,x=>{const parsed=pageSchema.safeParse(x);return parsed.success&&parsed.data.page===page;});
     const data=pageSchema.parse(result.data);
     if(data.total_pages>0&&data.results.length===0)throw new Error("Incomplete provider page; previous collection retained.");
     if(totalPages!==undefined&&Math.min(totalPages,spec.pages)!==Math.min(data.total_pages,spec.pages))throw new Error("Pagination changed during refresh; previous collection retained.");
     totalPages=data.total_pages;
     for(const m of data.results)if(!m.adult)ids.add(m.id);
    }
    const candidates=[...ids],collected:Movie[]=[];
    for(let i=0;i<candidates.length;i+=4)await Promise.all(candidates.slice(i,i+4).map(async id=>{
     let movie=known.get(id);
     if(!movie){
      const existing=await db.prepare("SELECT document,updated FROM discovery_movies WHERE id=?").bind(id).first<{document:string;updated:number}>();
      // Volatile release collections always refresh detail dates; broader metadata has a one-day TTL.
      if((kind!=="full"||options.collection)&&existing&&existing.updated>Date.now()-86400_000&&!spec.id.startsWith("upcoming")&&spec.id!=="now-playing-IN")movie=JSON.parse(existing.document);
      else{
       const result=await request(`movie/${id}`,{language:"en-US",append_to_response:"credits,videos,images,release_dates",include_image_language:"en,hi,null"},settings,x=>{const parsed=movieSchema.safeParse(x);return parsed.success&&parsed.data.id===id;});
       const raw=movieSchema.parse(result.data);if(raw.adult)return;
       movie=normalizeMovie(raw,genres,result.fetchedAt);
       const origins=movie.originCountries?.length?movie.originCountries:movie.productionCountries??[];
       await db.prepare("INSERT INTO discovery_movies(id,document,title,release_date,language,origins,genres,popularity,rating,votes,runtime,india_release,us_release,first_imported,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,title=excluded.title,release_date=excluded.release_date,language=excluded.language,origins=excluded.origins,genres=excluded.genres,popularity=excluded.popularity,rating=excluded.rating,votes=excluded.votes,runtime=excluded.runtime,india_release=excluded.india_release,us_release=excluded.us_release,updated=excluded.updated")
        .bind(id,JSON.stringify(movie),movie.title,movie.release,movie.originalLanguage??"",JSON.stringify(origins),JSON.stringify(movie.providerGenreIds??[]),raw.popularity??0,movie.rating,raw.vote_count??0,movie.duration,theatricalDate(movie,"IN"),theatricalDate(movie,"US"),Date.now(),Date.now()).run();
       if(existing)report.updated++;else report.imported++;
      }
      if(movie)known.set(id,movie);
     }
     if(movie&&qualifies(movie,spec,indiaToday(now)))collected.push(movie);
    }));
    // Restore provider ranking after concurrent detail fetches.
    collected.sort((a,b)=>candidates.indexOf(a.metadata!.tmdbId!)-candidates.indexOf(b.metadata!.tmdbId!));
    report.collections[spec.id]=await publishCollection(db,spec,collected,runId);
   }catch(error){
    report.failures++;const message=error instanceof TmdbError?error.code:"Collection refresh failed; previous snapshot retained.";
    report.collections[spec.id]={error:message};
    await db.prepare("INSERT INTO discovery_collections(id,last_attempt,error) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last_attempt=excluded.last_attempt,error=excluded.error").bind(spec.id,Date.now(),message).run();
    if(error instanceof TmdbError&&["TMDB_AUTH_FAILED","TMDB_NOT_CONFIGURED"].includes(error.code))throw error;
   }
   await db.prepare("UPDATE discovery_sync_lock SET expires=? WHERE owner=?").bind(Date.now()+20*60_000,runId).run();
   await db.prepare("UPDATE discovery_sync_runs SET report=? WHERE id=?").bind(JSON.stringify(report),runId).run();
  }
  await db.prepare("UPDATE discovery_sync_runs SET status=?,finished=?,report=? WHERE id=?").bind(report.failures?"partial":"success",Date.now(),JSON.stringify(report),runId).run();
 }catch(error){await db.prepare("UPDATE discovery_sync_runs SET status='failed',finished=?,report=? WHERE id=?").bind(Date.now(),JSON.stringify({...report,error:error instanceof TmdbError?error.code:"Sync failed"}),runId).run();throw error;}
 finally{await db.prepare("DELETE FROM discovery_sync_lock WHERE owner=?").bind(runId).run();}
 return {id:runId,kind,...report};
}
