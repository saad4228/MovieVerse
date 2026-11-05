import {z} from "zod";
import {tmdbRequest,TmdbError,genreSchema,pageSchema,movieSchema,normalizeMovie,type TmdbSettings} from "./tmdb";
export const genreQuery=z.object({genre:z.string().regex(/^[a-z-]+$/),page:z.coerce.number().int().min(1).max(500).default(1),sort:z.enum(["popular","rated","classic","recent"]).default("popular"),language:z.string().regex(/^[a-z]{2}$/).optional(),country:z.string().regex(/^[A-Z]{2}$/).optional(),year:z.coerce.number().int().min(1880).max(2100).optional(),q:z.string().trim().max(100).default(""),preview:z.enum(["true","false"]).default("false")});
export type GenreQuery=z.infer<typeof genreQuery>;
const definitions=[
 ["action","Action","High stakes, bold heroes and unforgettable action.",["Action"]],
 ["science-fiction","Science Fiction","Space, time and worlds beyond imagination.",["Science Fiction"]],
 ["adventure","Adventure","Extraordinary journeys and discoveries.",["Adventure"]],
 ["thriller","Thriller","Suspense that keeps you guessing.",["Thriller"]],
 ["horror","Horror","Haunting stories and unsettling encounters.",["Horror"]],
 ["romance","Romance","Connections that change everything.",["Romance"]],
 ["comedy","Comedy","A little laughter goes a long way.",["Comedy"]],
 ["drama","Drama","Human stories with lasting impact.",["Drama"]],
 ["crime-mystery","Crime & Mystery","Secrets, investigations and dangerous choices.",["Crime","Mystery"]],
 ["fantasy","Fantasy","Magic, myth and impossible worlds.",["Fantasy"]],
 ["animation","Animation","Imagination brought to life.",["Animation"]],
 ["family","Family & Kids","Stories to discover together.",["Family"]],
 ["history-war","History & War","Lives shaped by extraordinary times.",["History","War"]],
 ["music","Music & Musicals","Stories driven by rhythm and song.",["Music"]],
 ["documentary","Documentary","Real stories, new perspectives.",["Documentary"]],
] as const;
export type GenreCollection={slug:string;name:string;description:string;ids:number[]};
export async function genreCollections(settings:TmdbSettings):Promise<GenreCollection[]> {
 const result=await tmdbRequest("genre/movie/list",{language:"en-US"},settings,86400000,v=>genreSchema.safeParse(v).success);
 const genres=genreSchema.parse(result.data).genres;
 return definitions.map(([slug,name,description,names])=>({slug,name,description,ids:genres.filter(g=>(names as readonly string[]).includes(g.name)).map(g=>g.id)})).filter(g=>g.ids.length);
}
export async function genreMovies(query:GenreQuery,settings:TmdbSettings){
 const collections=await genreCollections(settings),collection=collections.find(c=>c.slug===query.genre);
 if(!collection)throw new TmdbError("GENRE_NOT_FOUND","This genre is unavailable.",404);
 const genreData=await tmdbRequest("genre/movie/list",{language:"en-US"},settings,86400000,v=>genreSchema.safeParse(v).success);
 const names=new Map(genreSchema.parse(genreData.data).genres.map(g=>[g.id,g.name]));
 const params:Record<string,string>={language:"en-US",include_adult:"false",include_video:"false",page:String(query.page)};
 if(query.q) params.query=query.q;
 else Object.assign(params,{with_genres:collection.ids.join("|"),sort_by:({popular:"popularity.desc",rated:"vote_average.desc",classic:"vote_average.desc",recent:"primary_release_date.desc"})[query.sort],"vote_count.gte":query.sort==="rated"||query.sort==="classic"?"100":"20","primary_release_date.lte":query.sort==="classic"?"1999-12-31":new Date().toISOString().slice(0,10)});
 if(query.language&&!query.q)params.with_original_language=query.language;
 if(query.country&&!query.q)params.with_origin_country=query.country;
 if(query.year)params[query.q?"year":"primary_release_year"]=String(query.year);
 const fetchPage=async(extra:Record<string,string>)=>{
  const p={...params,...extra};const result=await tmdbRequest(query.q?"search/movie":"discover/movie",p,settings,900000,v=>{const parsed=pageSchema.safeParse(v);return parsed.success&&parsed.data.page===Number(p.page);});
  const data=pageSchema.parse(result.data);
  // Search does not support origin-country filters. Resolve only this page's
  // candidates when that filter is requested, with at most four detail calls at once.
  const verifiedOrigins=new Map<number,string[]>();
  if(query.q && query.country){
   const candidates=data.results.filter(m=>!m.adult&&(m.genre_ids??[]).some(id=>collection.ids.includes(id))&&(!query.language||m.original_language===query.language));
   for(let i=0;i<candidates.length;i+=4)await Promise.all(candidates.slice(i,i+4).map(async m=>{
    if(m.origin_country?.length){verifiedOrigins.set(m.id,m.origin_country);return;}
    const detail=await tmdbRequest(`movie/${m.id}`,{language:"en-US"},settings,3600000,v=>movieSchema.safeParse(v).success);
    verifiedOrigins.set(m.id,movieSchema.parse(detail.data).origin_country ?? []);
   }));
  }
  return {...data,movies:data.results.filter(m=>!m.adult&&(m.genre_ids??[]).some(id=>collection.ids.includes(id))&&(!query.q||!query.language||m.original_language===query.language)&&(!query.q||!query.country||(verifiedOrigins.get(m.id)??m.origin_country)?.includes(query.country))).map(m=>{const normalized=normalizeMovie(m,names,result.fetchedAt);if(verifiedOrigins.has(m.id))normalized.originCountries=verifiedOrigins.get(m.id);return normalized;})};
 };
 const pages=await Promise.all(query.preview==="true"&&!query.q&&!query.country&&!query.language&&!query.year?[fetchPage({}),fetchPage({with_origin_country:"IN"}),fetchPage({sort_by:"vote_average.desc","vote_count.gte":"100"})]:[fetchPage({})]);
 const canonical=new Map<string,ReturnType<typeof normalizeMovie>>();
 for(let i=0;i<15;i++)for(const page of pages){const movie=page.movies[i];if(movie)canonical.set(movie.id,movie);}
 return {source:"tmdb" as const,collection,page:query.page,totalPages:Math.min(500,pages[0].total_pages),totalResults:query.q?undefined:pages[0].total_results,searchFiltered:!!query.q,movies:[...canonical.values()].slice(0,query.preview==="true"?30:20)};
}
export type GenreResult=Awaited<ReturnType<typeof genreMovies>>;
