import type {Movie} from "./catalog";
export function watchlistKey(movie:Pick<Movie,"id"|"metadata">){
 return movie.metadata?.tmdbId?`tmdb-${movie.metadata.tmdbId}`:movie.id;
}
export type WatchlistEntry={key:string;movie:Movie|null;added:number;nowPlaying:boolean};
