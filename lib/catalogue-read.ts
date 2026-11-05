import type {Movie} from "./catalog";
import {indiaToday,officialGenres} from "./discovery-collections";
import type {GenreCollection,GenreQuery} from "./genre-catalog";
export type CataloguePage={source:"tmdb-d1";movies:Movie[];page:number;totalPages:number;totalResults:number;lastSync:number|null};
export function databaseGenres():GenreCollection[]{return officialGenres.map(([id,slug,name])=>({slug,name,description:`Discover ${name.toLowerCase()} films from around the world.`,ids:[id]}));}
export async function cataloguePage(db:D1Database,params:URLSearchParams):Promise<CataloguePage>{
 const page=Math.min(500,Math.max(1,Math.floor(Number(params.get("page"))||1))),size=params.get("preview")==="true"?20:40;
 const where=["1=1"],bindings:(string|number)[]=[],today=indiaToday();let order="m.popularity DESC,m.id";
 const collection=params.get("collection")||"all",region=params.get("region")||"IN";
 const member=(id:string)=>{where.push("EXISTS(SELECT 1 FROM discovery_memberships x JOIN discovery_collections c ON c.id=x.collection AND c.generation=x.generation WHERE x.movie_id=m.id AND x.collection=?)");bindings.push(id);};
 if(collection.startsWith("recent-")){
  const past=new Date();past.setUTCMonth(past.getUTCMonth()-12);
  const market=collection.slice(7),field=market==="US"?"m.us_release":market==="international"?"m.release_date":"m.india_release";
  where.push(`${field}>=? AND ${field}<=?`);bindings.push(indiaToday(past),today);
  if(market==="international")where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value NOT IN ('US','IN'))");
  else {where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value=?)");bindings.push(market==="US"?"US":"IN");}
  if(["hi","ta","te","ml","kn"].includes(market)){where.push("m.language=?");bindings.push(market);}
  order=`${field} DESC,m.id`;
 }else if(collection.startsWith("upcoming-language-")){
  member("upcoming-IN");where.push("m.india_release>? AND m.language=?");bindings.push(today,collection.slice(18));
 }else if(collection==="upcoming"||collection==="upcoming-global"){
  if(region==="global"||collection==="upcoming-global"){where.push("m.release_date>?");bindings.push(today);member("upcoming-global");}
  else{where.push(region==="US"?"m.us_release>?":"m.india_release>?");bindings.push(today);member(region==="US"?"upcoming-US":"upcoming-IN");}
 }else if(collection==="now-playing-IN"){member(collection);where.push("m.india_release<=?");bindings.push(today);}
 else if(collection==="hollywood"){where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value='US')");}
 else if(collection==="indian"){where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value='IN')");}
 else if(collection==="international"){where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value NOT IN ('US','IN'))");}
 else if(collection!=="all")member(collection);
 if(params.get("country")){where.push("EXISTS(SELECT 1 FROM json_each(m.origins) WHERE value=?)");bindings.push(params.get("country")!);}
 const language=params.get("language");if(language&&language!=="All"){where.push("m.language=?");bindings.push(language);}
 const genre=params.get("genre"),definition=officialGenres.find(([id,slug,name])=>String(id)===genre||slug===genre||name===genre);
 if(definition){where.push("EXISTS(SELECT 1 FROM json_each(m.genres) WHERE value=?)");bindings.push(definition[0]);}
 if(params.get("q")){where.push("(m.title LIKE ? ESCAPE '\\' OR json_extract(m.document,'$.aliases') LIKE ? ESCAPE '\\' OR json_extract(m.document,'$.cast') LIKE ? ESCAPE '\\')");const q=`%${params.get("q")!.slice(0,100).replace(/[\\%_]/g,"\\$&")}%`;bindings.push(q,q,q);}
 if(params.get("year")){where.push("substr(m.release_date,1,4)=?");bindings.push(params.get("year")!);}
 if(params.get("rating")){where.push("m.rating>=?");bindings.push(Number(params.get("rating"))||0);}
 const sort=params.get("sort");if(["rated","Top rated","classic"].includes(sort??"")){where.push("m.votes>=100");order="m.rating DESC,m.votes DESC,m.id";}
 if(sort==="classic"){where.push("m.release_date<>'' AND m.release_date<'2000-01-01'");}
 if(sort==="recent")order="m.release_date DESC,m.id";
 if(sort==="A–Z")order="m.title COLLATE NOCASE,m.id";
 if(sort==="Shortest first"){where.push("m.runtime>0");order="m.runtime,m.id";}
 const sql=where.join(" AND ");
 const [count,rows,sync]=await Promise.all([
 db.prepare(`SELECT count(*) AS n FROM discovery_movies m WHERE ${sql}`).bind(...bindings).first<{n:number}>(),
 db.prepare(`SELECT document FROM discovery_movies m WHERE ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...bindings,size,(page-1)*size).all<{document:string}>(),
 db.prepare("SELECT max(last_success) AS n FROM discovery_collections").first<{n:number|null}>(),
 ]);
 return {source:"tmdb-d1",movies:rows.results.map(r=>JSON.parse(r.document)),page,totalPages:Math.ceil((count?.n??0)/size),totalResults:count?.n??0,lastSync:sync?.n??null};
}
export async function databaseGenrePage(db:D1Database,query:GenreQuery){
 const collection=databaseGenres().find(g=>g.slug===query.genre);
 if(!collection)throw new Error("Unknown genre");
 const params=new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));
 const result=await cataloguePage(db,params);return {...result,collection,searchFiltered:false};
}
// Round-robin by actual origin/language prevents one market dominating featured selections.
export function balancedFeatured(groups:Movie[][],pins:Movie[]=[],limit=12){
 const result:Movie[]=[],seen=new Set<string>(),languages=new Map<string,number>();
 const add=(m:Movie)=>{if(seen.has(m.id)||!m.poster||!m.backdrop)return;seen.add(m.id);result.push(m);languages.set(m.originalLanguage??"",(languages.get(m.originalLanguage??"")??0)+1);};
 pins.forEach(add);
 const queues=groups.map(group=>[...group].sort((a,b)=>(languages.get(a.originalLanguage??"")??0)-(languages.get(b.originalLanguage??"")??0)));
 for(let i=0;i<100&&result.length<limit;i++)for(const group of queues){const movie=group.shift();if(movie&&result.length<limit)add(movie);}
 return result.slice(0,limit);
}
export async function catalogueHome(db:D1Database){
 const keys=["now-playing-IN","upcoming","trending-day","popular","hollywood","indian","upcoming-global","regional-ta","regional-te","regional-hi","regional-ml","regional-kn","international"];
 const pages=await Promise.all(keys.map(collection=>cataloguePage(db,new URLSearchParams({collection,region:collection==="upcoming-global"?"global":"IN",preview:"true"}))));
 const collections=Object.fromEntries(keys.map((key,i)=>[key,pages[i].movies]));
 const settings=await db.prepare("SELECT document FROM discovery_settings WHERE id='featured-pins'").first<{document:string}>();
 const pins:Movie[]=[];for(const id of settings?JSON.parse(settings.document) as number[]:[]){const row=await db.prepare("SELECT document FROM discovery_movies WHERE id=?").bind(id).first<{document:string}>();if(row)pins.push(JSON.parse(row.document));}
 const regional=[...new Map(keys.filter(k=>k.startsWith("regional-")).flatMap(k=>collections[k]).map(m=>[m.id,m])).values()];
 return {source:"tmdb-d1",lastSync:pages[0].lastSync,collections,regional,featured:balancedFeatured([collections["trending-day"],collections.indian,collections.hollywood,collections.upcoming,collections["upcoming-global"],collections.international],pins)};
}
export async function catalogueStatus(db:D1Database){
 const [counts,collections,runs,genres,lastSuccess]=await Promise.all([
 db.prepare("SELECT count(*) AS total,sum(EXISTS(SELECT 1 FROM json_each(origins) WHERE value='US')) AS hollywood,sum(EXISTS(SELECT 1 FROM json_each(origins) WHERE value='IN')) AS indian,sum(EXISTS(SELECT 1 FROM json_each(origins) WHERE value NOT IN ('IN','US'))) AS international FROM discovery_movies").first(),
 db.prepare("SELECT c.*, (SELECT count(*) FROM discovery_memberships m WHERE m.collection=c.id AND m.generation=c.generation) AS count FROM discovery_collections c ORDER BY id").all(),
 db.prepare("SELECT * FROM discovery_sync_runs ORDER BY started DESC LIMIT 20").all(),
 db.prepare("SELECT value AS id,count(*) AS count FROM discovery_movies,json_each(genres) GROUP BY value").all(),
 db.prepare("SELECT kind,max(finished) AS finished FROM discovery_sync_runs WHERE status='success' AND kind IN ('full','trending') GROUP BY kind").all(),
 ]);const nowPlaying=await cataloguePage(db,new URLSearchParams({collection:"now-playing-IN"})),upcoming=await cataloguePage(db,new URLSearchParams({collection:"upcoming"}));
 return {counts,nowPlaying:nowPlaying.totalResults,upcomingIndia:upcoming.totalResults,lastSuccess:lastSuccess.results,collections:collections.results,runs:runs.results,genres:genres.results,schedules:{full:"0 3 * * *",trending:"0 */6 * * *"}};
}
