import {expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {discoveryDb} from "./helpers/discovery-db";
import {changeWatchlist,readWatchlist,watchlistInput} from "../lib/watchlist";
import {movies,venues,cities,blueprints,snacks} from "../lib/catalog";
import type {Catalog} from "../lib/catalog-config";
const catalog:Catalog={movies,venues,cities,blueprints,snacks};
function setup(){const {db,sqlite}=discoveryDb();sqlite.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('a'),('b');");sqlite.exec(readFileSync("drizzle/0005_account_watchlist.sql","utf8"));return{db,sqlite};}
it("persists references per user, prevents duplicates, and keeps the original save time",async()=>{
 const {db,sqlite}=setup();const movie=movies[0];
 const first=await changeWatchlist(db,"a",catalog,{id:movie.id,saved:true});
 await Promise.all(Array.from({length:4},()=>changeWatchlist(db,"a",catalog,{id:movie.id,saved:true})));
 const rows=await readWatchlist(db,"a",catalog);expect(rows).toHaveLength(1);expect(rows[0].added).toBe(first.entry!.added);
 expect(await readWatchlist(db,"b",catalog)).toEqual([]);
 await changeWatchlist(db,"b",catalog,{id:movie.id,saved:false});expect(await readWatchlist(db,"a",catalog)).toHaveLength(1);
 await changeWatchlist(db,"b",catalog,{id:movie.id,saved:true});expect(await readWatchlist(db,"b",catalog)).toHaveLength(1);
 await changeWatchlist(db,"a",catalog,{id:movie.id,saved:false});expect(await readWatchlist(db,"a",catalog)).toEqual([]);expect(await readWatchlist(db,"b",catalog)).toHaveLength(1);sqlite.close();
});
it("normalizes catalogue/demo aliases without duplicating movie records",async()=>{
 const {db,sqlite}=setup();const movie={...movies[0],id:"alias-film",metadata:{...movies[0].metadata!,tmdbId:12345}};
 const fixture={...catalog,movies:[movie]};
 await changeWatchlist(db,"a",fixture,{id:movie.id,saved:true});await changeWatchlist(db,"a",fixture,{id:"tmdb-12345",saved:true});
 expect(await readWatchlist(db,"a",fixture)).toHaveLength(1);
 expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_movies").get()?.n).toBe(0);
 await changeWatchlist(db,"a",fixture,{id:"tmdb-12345",saved:false});expect(await readWatchlist(db,"a",fixture)).toEqual([]);sqlite.close();
});
it("validates IDs, rejects forged user IDs and allows removing an archived reference",async()=>{
 const {db,sqlite}=setup();expect(watchlistInput.safeParse({id:"coolie",saved:true,userId:"b"}).success).toBe(false);
 expect(watchlistInput.safeParse({id:"../invalid",saved:true}).success).toBe(false);
 await expect(changeWatchlist(db,"a",catalog,{id:"unknown-film",saved:true})).rejects.toThrow("not available");
 await db.prepare("INSERT INTO user_watchlist VALUES('a','removed-film',1)").run();
 expect((await readWatchlist(db,"a",catalog))[0].movie).toBeNull();
 await changeWatchlist(db,"a",catalog,{id:"removed-film",saved:false});expect(await readWatchlist(db,"a",catalog)).toEqual([]);sqlite.close();
});
it("deletes only watchlist references when an account is removed",async()=>{
 const {db,sqlite}=setup();await changeWatchlist(db,"a",catalog,{id:movies[0].id,saved:true});sqlite.prepare("DELETE FROM users WHERE id='a'").run();expect(sqlite.prepare("SELECT count(*) AS n FROM user_watchlist").get()?.n).toBe(0);sqlite.close();
});
