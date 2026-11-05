import {expect,it} from "vitest";
import {movieHref,safeReturnTo} from "../lib/movie-navigation";
it("keeps originating queries and anchors in one safe return destination",()=>{
 const source="/genres/action?sort=rated&country=US&page=3#genre-action";
 const url=new URL(movieHref("/movies/tmdb-155#showtimes",source),"https://movieverse.test");
 expect(url.pathname).toBe("/movies/tmdb-155");expect(url.hash).toBe("#showtimes");expect(url.searchParams.get("returnTo")).toBe(source);
 expect(movieHref("/cinemas","/explore")).toBe("/cinemas");
 expect(new URL(movieHref(url.pathname+url.search,"/coming-soon"),url.origin).searchParams.getAll("returnTo")).toEqual(["/coming-soon"]);
});
it("rejects external, malformed and executable return destinations",()=>{
 for(const input of [undefined,"https://evil.test","//evil.test","javascript:alert(1)","/\\evil.test","/%5cevil.test","/%00","/%E0%A4%A"])expect(safeReturnTo(input)).toBe("/movies");
 expect(safeReturnTo("/coming-soon?language=Tamil&sort=Top+rated")).toBe("/coming-soon?language=Tamil&sort=Top+rated");
});
