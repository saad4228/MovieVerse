import {dates,showsFor,type Movie,type Show} from "./catalog";
import type {Catalog} from "./catalog-config";
import {discoveryStatus} from "./movie-discovery";
import {regionalRelease} from "./movie-information";
export function carouselScreenings(catalog:Catalog,city:string,now=new Date()){
 return catalog.movies.flatMap(movie=>{
  if(!["now-showing","advance-booking"].includes(discoveryStatus(movie,city,catalog.venues,now)))return [];
  const release=regionalRelease(movie)?.date;
  const shows=catalog.venues.filter(v=>v.cityId===city&&v.movieIds.includes(movie.id)).flatMap(venue=>dates().flatMap(date=>showsFor(venue,movie.id,date,catalog.movies))).filter(show=>Date.parse(`${show.date}T${show.time}:00+05:30`)>now.getTime()&&(!release||show.date>=release));
  return shows.length?[{movie,shows}]:[];
 });
}
export function availableCarousel(candidates:{movie:Movie;shows:Show[]}[],availability:Map<string,number>){
 // Uninitialized demo screenings are available to open; known sold-out screenings are excluded.
 return candidates.filter(candidate=>candidate.shows.some(show=>!availability.has(show.id)||availability.get(show.id)!>0));
}
export async function bookableFeatured(db:D1Database,catalog:Catalog,city:string){
 const candidates=carouselScreenings(catalog,city);
 const ids=candidates.flatMap(c=>c.shows.map(s=>s.id));
 const rows=ids.length?await db.prepare("SELECT show_id,sum(CASE WHEN status='available' OR (status='held' AND expires<?) THEN 1 ELSE 0 END) AS available FROM inventory WHERE show_id IN (SELECT value FROM json_each(?)) GROUP BY show_id").bind(Date.now(),JSON.stringify(ids)).all<{show_id:string;available:number}>():{results:[]};
 const available=availableCarousel(candidates,new Map(rows.results.map(r=>[r.show_id,r.available])));
 const tmdbIds=available.map(c=>c.movie.metadata?.tmdbId).filter((id):id is number=>!!id);
 const artwork=tmdbIds.length?await db.prepare("SELECT id,document FROM discovery_movies WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(tmdbIds)).all<{id:number;document:string}>():{results:[]};
 const records=new Map(artwork.results.map(row=>[row.id,JSON.parse(row.document) as Movie]));
 const featured=available.map(({movie})=>{
  const synced=records.get(movie.metadata?.tmdbId??0);
  return synced?{...movie,poster:synced.poster||movie.poster,backdrop:synced.backdrop||movie.backdrop,alternativeBackdrops:synced.alternativeBackdrops??movie.alternativeBackdrops}:movie;
 }).filter(movie=>movie.poster);
 return {source:"demo-screenings",city,featured,checked:new Date().toISOString()};
}
