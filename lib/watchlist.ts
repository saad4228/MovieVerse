import {z} from "zod";
import type {Catalog} from "./catalog-config";
import type {Movie} from "./catalog";
import {watchlistKey,type WatchlistEntry} from "./watchlist-key";
import {indiaToday} from "./discovery-collections";
export const watchlistInput=z.object({id:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,99}$/),saved:z.boolean()}).strict();
export class WatchlistMovieError extends Error{}
export async function readWatchlist(db:D1Database,userId:string,catalog:Catalog):Promise<WatchlistEntry[]>{
 const rows=await db.prepare(`SELECT w.movie_key,w.added,m.document,
 EXISTS(SELECT 1 FROM discovery_memberships x JOIN discovery_collections c ON c.id=x.collection AND c.generation=x.generation
 WHERE x.movie_id=m.id AND x.collection='now-playing-IN' AND m.india_release<=?) AS now_playing
 FROM user_watchlist w LEFT JOIN discovery_movies m ON w.movie_key LIKE 'tmdb-%' AND m.id=CAST(substr(w.movie_key,6) AS INTEGER)
 WHERE w.user_id=? ORDER BY w.added DESC,w.movie_key`).bind(indiaToday(),userId).all<{movie_key:string;added:number;document:string|null;now_playing:number}>();
 return rows.results.map(row=>({key:row.movie_key,added:row.added,nowPlaying:!!row.now_playing,movie:row.document?JSON.parse(row.document) as Movie:catalog.movies.find(m=>watchlistKey(m)===row.movie_key)??null}));
}
export async function changeWatchlist(db:D1Database,userId:string,catalog:Catalog,input:z.infer<typeof watchlistInput>){
 const legacy=catalog.movies.find(m=>m.id===input.id||watchlistKey(m)===input.id);
 const key=legacy?watchlistKey(legacy):input.id;
 if(!input.saved){await db.prepare("DELETE FROM user_watchlist WHERE user_id=? AND movie_key=?").bind(userId,key).run();return {key,saved:false};}
 let known=!!legacy;
 if(!known&&/^tmdb-[1-9]\d*$/.test(key))known=!!await db.prepare("SELECT id FROM discovery_movies WHERE id=?").bind(Number(key.slice(5))).first();
 if(!known)throw new WatchlistMovieError("This movie is not available in the catalogue.");
 // One reference per user and canonical movie. Repeated add requests are idempotent.
 await db.prepare("INSERT INTO user_watchlist(user_id,movie_key,added) VALUES(?,?,?) ON CONFLICT(user_id,movie_key) DO NOTHING").bind(userId,key,Date.now()).run();
 const entry=(await readWatchlist(db,userId,catalog)).find(entry=>entry.key===key);
 return {key,saved:true,entry};
}
