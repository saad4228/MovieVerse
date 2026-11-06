import {describe,expect,it} from "vitest";
import {movies} from "../lib/catalog";
import {searchMovieRecords} from "../lib/movie-discovery";

describe("global movie search",()=>{
  it("finds a local bookable title even when the external catalogue has no match",()=>{
    const sintel=movies.find(movie=>movie.id==="sintel")!;
    expect(searchMovieRecords([],movies,"Sintel")).toContain(sintel);
    expect(searchMovieRecords([],movies,"no matching film 786431")).toEqual([]);
  });
  it("deduplicates the same provider movie while retaining the local booking identity",()=>{
    const local={...movies[0],metadata:{...movies[0].metadata!,tmdbId:42}};
    const remote={...local,id:"tmdb-42"};
    expect(searchMovieRecords([remote],[local],local.title)).toEqual([local]);
    expect(searchMovieRecords([remote,remote],[local,local],local.title)).toHaveLength(1);
  });
  it("does not return duplicate links when records share a local id but have different provider metadata",()=>{
    const first={...movies[0],metadata:{...movies[0].metadata!,tmdbId:42}};
    const conflicting={...first,metadata:{...first.metadata!,tmdbId:43}};
    expect(searchMovieRecords([first,conflicting],[],first.title)).toEqual([conflicting]);
  });
});
