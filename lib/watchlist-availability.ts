import {movies,venues} from "./catalog";
import {discoveryStatus} from "./movie-discovery";
import {indiaToday} from "./discovery-collections";
import {regionalRelease,releaseLabel} from "./movie-information";
import type {WatchlistEntry} from "./watchlist-key";
export function watchlistAvailability(entry:WatchlistEntry,city:string){
 const movie=entry.movie;if(!movie)return {status:"unavailable",label:"Movie unavailable",detail:"This title is no longer in the catalogue.",date:"Release unavailable"};
 const demo=movies.find(m=>m.id===movie.id||(m.metadata?.tmdbId&&m.metadata.tmdbId===movie.metadata?.tmdbId));
 const booking=demo?discoveryStatus(demo,city,venues):null;
 const regional=regionalRelease(movie,"IN"),date=regional?.date&&regional.status!=="unconfirmed"?regional.date:movie.release;
 const dateLabel=regional?.date&&regional.status!=="unconfirmed"?releaseLabel(movie):movie.release?`Global release: ${new Date(`${movie.release}T12:00:00Z`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"})}`:"Release to be confirmed";
 if(booking==="now-showing")return {status:"now-showing",label:"Now Showing",detail:"Demo screening available in your city",date:dateLabel};
 if(date&&date>indiaToday())return {status:"coming-soon",label:"Coming Soon",detail:booking==="advance-booking"?"Demo advance booking available":"Screenings are not confirmed",date:dateLabel};
 if(entry.nowPlaying)return {status:"now-showing",label:"Now Showing",detail:"TMDB India discovery · check local screenings",date:dateLabel};
 return date?{status:"released",label:"Released",detail:"Explore the film; local availability is separate",date:dateLabel}:{status:"unconfirmed",label:"Release unconfirmed",detail:"A release date has not been supplied",date:dateLabel};
}
