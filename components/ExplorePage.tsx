"use client";
import "./explore.css";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useBrowseState} from "@/lib/use-browse-state";
import type {Movie} from "@/lib/catalog";
import {cities} from "@/lib/catalog";
import {useApp} from "@/lib/store";
import {useCataloguePage,useCatalogueResource} from "@/lib/discovery-client";
import {useSearchParams} from "next/navigation";
import {MovieCard} from "./MovieCards";
import {MovieDiscovery} from "./Discovery";
import MovieRail from "./MovieRail";
import {GenreDiscovery} from "./GenreDiscovery";

import {exploreCollections} from "@/lib/explore-collections";
function Collection({id,title,description}:{id:string;title:string;description:string}){
 const ref=useRef<HTMLElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"350px"});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
 return <section ref={ref} className="explore-collection" aria-label={title}><div className="film-section-heading"><div><h2>{title}</h2><p className="muted">{description}</p></div><Link className="text-link" href={`/explore?collection=${id}`}>View all →</Link></div>{visible&&<CollectionContent id={id} title={title}/>}</section>;
}
function CollectionContent({id,title}:{id:string;title:string}){
 const {data,error,retry}=useCataloguePage(new URLSearchParams({collection:id,preview:"true",region:id==="upcoming-global"?"global":"IN"}).toString());
 return error?<p role="status">{error} <button className="text-link" onClick={retry}>Try again</button></p>:!data?<p role="status">Finding stories…</p>:data.movies.length?<MovieRail label={title}>{data.movies.map((movie,index)=><MovieCard key={movie.id} movie={movie} index={index} catalogue/>)}</MovieRail>:<p className="muted">This collection is waiting for its next catalogue update.</p>;
}
export default function ExplorePage(){
 const params=useSearchParams();
 const {data}=useCataloguePage("collection=popular&preview=true");
 const artwork=data?.movies.find(movie=>movie.backdrop);
 if(params.size)return <><div className="section-container explore-return"><Link className="text-link" href="/explore">← Explore collections</Link></div><MovieDiscovery explore/></>;
 return <main className="section-container explore-page"><header className="explore-hero">
  {artwork&&<img src={artwork.backdrop} alt="" fetchPriority="high"/>}<div><span className="eyebrow">STORIES WITHOUT BORDERS</span><h1>Explore the MovieVerse</h1><p>From legendary classics to the latest global releases. Find your next favourite story.</p><div className="explore-actions"><Link className="btn btn-gold" href="/explore?collection=all">Search all movies</Link><a className="btn btn-outline" href="#explore-genres">Browse by genre</a><Link className="text-link" href="/explore?collection=hollywood">Explore Hollywood →</Link></div></div>
 </header><p className="demo-note">Discovering a film does not mean it is screening nearby. Visit <Link href="/movies">Movies</Link> for available demo cinema screenings, or save a story to your Watchlist.</p>
 {exploreCollections.map(([id,title,description])=><Collection key={id} id={id} title={title} description={description}/>)}<GenreDiscovery/></main>;
}
export function CinemaMoviesPage(){
 const city=useApp(s=>s.city);
 const [{query,language},setBrowse]=useBrowseState(`movieverse-cinema-movies:${city}`,{query:"",language:"All"});
 const setQuery=(query:string)=>setBrowse(state=>({...state,query}));
 const setLanguage=(language:string)=>setBrowse(state=>({...state,language}));
 const {data,error,retry}=useCatalogueResource<{featured:Movie[]}>(`/api/bookable-featured?city=${encodeURIComponent(city)}`);
 const list=data?.featured.filter(movie=>(language==="All"||movie.languages.includes(language))&&movie.title.toLowerCase().includes(query.toLowerCase()))??[];
 return <main className="discovery-page section-container"><div className="page-intro"><span className="eyebrow">MAKE IT A MOVIE DAY</span><h1>Movies in {cities.find(c=>c.id===city)?.name}</h1><p>Find your film. Pick your cinema. Make a memory.</p></div><p className="demo-note">Available simulated screenings in your selected city. Bookings and payments are demonstrations, not live cinema inventory.</p><div className="filter-row"><input className="filter-search" aria-label="Search cinema movies" placeholder="Find a movie…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Screening language" value={language} onChange={e=>setLanguage(e.target.value)}>{["All",...new Set(data?.featured.flatMap(m=>m.languages))].map(l=><option key={l}>{l}</option>)}</select><Link className="text-link" href="/coming-soon">Coming soon →</Link></div>
 {error?<p role="alert">{error} <button className="text-link" onClick={retry}>Try again</button></p>:!data?<p role="status">Finding screenings…</p>:list.length?<div className="movie-grid">{list.map(movie=><MovieCard key={movie.id} movie={movie}/>)}</div>:<div className="empty"><h2>No matching screenings in this city</h2><p>Try another city or discover a story for your Watchlist.</p><Link className="btn btn-gold" href="/explore">Explore the MovieVerse</Link></div>}
 <ExplorePromo/></main>;
}
export function ExplorePromo(){return <section className="explore-promo"><span className="eyebrow">THERE’S A WHOLE WORLD BEYOND THE SCREEN</span><h2>Your next favourite story is out there.</h2><p>Explore Hollywood favourites, Indian cinema and stories across every genre.</p><Link className="btn btn-gold" href="/explore">Explore the MovieVerse →</Link></section>;}
