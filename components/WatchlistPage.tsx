"use client";
import AssetImage from "@/components/AssetImage";
import "./watchlist.css";
import {useBrowseState} from "@/lib/use-browse-state";
import Link from "./MovieLink";
import {Heart,Search,Star,ArrowUpRight,Film} from "lucide-react";
import {useWatchlist} from "@/lib/watchlist-client";
import {useApp} from "@/lib/store";
import {watchlistAvailability} from "@/lib/watchlist-availability";
import WatchlistButton from "./WatchlistButton";
export default function WatchlistPage(){
 const {entries,userId,loading,error,pending,load,remove}=useWatchlist();const city=useApp(s=>s.city);
 const [{query,sort,filter},setBrowse]=useBrowseState(`movieverse-watchlist-browse:${userId??"guest"}:${city}`,{query:"",sort:"newest",filter:"all"});
 const setQuery=(query:string)=>setBrowse(state=>({...state,query}));
 const setSort=(sort:string)=>setBrowse(state=>({...state,sort}));
 const setFilter=(filter:string)=>setBrowse(state=>({...state,filter}));
 const all=Object.values(entries);
 const shown=all.map(entry=>({...entry,availability:watchlistAvailability(entry,city)})).filter(entry=>(filter==="all"||entry.availability.status===filter)&&(!query.trim()||[entry.movie?.title,...entry.movie?.genre??[]].join(" ").toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>sort==="title"?(a.movie?.title??"").localeCompare(b.movie?.title??""):sort==="rating"?(b.movie?.rating??0)-(a.movie?.rating??0):sort==="release"?(b.movie?.release??"").localeCompare(a.movie?.release??""):sort==="oldest"?a.added-b.added:b.added-a.added);
 return <main className="watchlist-page section-container">
  <div className="page-intro"><span className="eyebrow">YOUR STORIES, SAVED FOR LATER</span><h1>Your Movie Collection</h1><p>The films you love. The stories you’re waiting to discover.</p><span className="watchlist-count"><Heart size={14}/>{all.length} saved {all.length===1?"movie":"movies"}</span></div>
  {error&&<div className="watchlist-error" role="alert">{error}<button onClick={()=>void load()}>Try again</button></div>}
  {loading?<div className="watchlist-empty" role="status"><span className="spinner"/><p>Opening your movie collection…</p></div>:userId===null?<div className="watchlist-empty"><Heart size={38}/><h2>A collection that stays with you.</h2><p>Sign in to save movies to your account and find them again on any device.</p><Link className="btn btn-gold" href="/login?next=%2Fwatchlist">Sign in to your watchlist <ArrowUpRight size={16}/></Link></div>:userId? <>
   {all.length>0&&<><div className="watchlist-toolbar"><label>Search your collection<input aria-label="Search watchlist" value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} placeholder="Find a saved movie…"/></label><label>Sort by<select aria-label="Sort watchlist" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Recently saved</option><option value="oldest">Saved first</option><option value="title">Title A–Z</option><option value="rating">Highest rated</option><option value="release">Latest release</option></select></label></div><div className="watchlist-filters" role="group" aria-label="Watchlist availability">{[["all","All movies"],["now-showing","Now Showing"],["coming-soon","Coming Soon"],["released","Released"]].map(([value,label])=><button key={value} className={`chip ${value===filter?"selected":""}`} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><p className="watchlist-results" role="status">{shown.length} of {all.length} saved movies</p></>}
   {!all.length?<div className="watchlist-empty"><Heart size={40}/><h2>Your next favourite belongs here.</h2><p>Save a film that catches your eye. Your collection will be waiting whenever you’re ready.</p><Link className="btn btn-gold" href="/movies">Explore movies <ArrowUpRight size={16}/></Link></div>:!shown.length?<div className="watchlist-empty"><Search size={32}/><h2>No matching stories.</h2><p>Try another search or availability filter.</p><button className="btn btn-outline" onClick={()=>{setQuery("");setFilter("all");}}>Clear filters</button></div>:<div className="watchlist-grid">{shown.map(entry=><article className="watchlist-card" key={entry.key} data-watchlist-key={entry.key}>
    {entry.movie?<>
     <div className="watchlist-poster-wrap">
      <Link className="watchlist-art" href={`/movies/${entry.movie.id}`} aria-label={`Explore ${entry.movie.title}`}>
       <span className="poster-fallback">{entry.movie.title}</span>
       {entry.movie.poster&&<AssetImage src={entry.movie.poster} alt={`${entry.movie.title} poster`} loading="lazy" decoding="async" width={500} height={750} onError={e=>{e.currentTarget.style.visibility="hidden";}}/>}
       <h2 className="watchlist-art-title">{entry.movie.title}</h2>
      </Link>
      <span className={`watchlist-availability ${entry.availability.status}`}>{entry.availability.label}</span>
      <WatchlistButton movie={entry.movie} variant="icon"/>
     </div>
     <div className="watchlist-card-body">
      <div className="watchlist-card-meta"><span>{entry.availability.date}</span><span className="watchlist-rating"><Star size={12}/>{entry.movie.rating?`${entry.movie.rating.toFixed(1)} / 10`:"Not rated"}</span></div>
      <p className="watchlist-genres">{entry.movie.genre.join(" · ")||"Genre not supplied"}</p>
      <div className="watchlist-card-actions"><Link className="btn btn-gold" href={`/movies/${entry.movie.id}`}>Explore movie <ArrowUpRight size={13}/></Link></div>
     </div>
    </>:<div className="watchlist-card-missing"><Film size={30}/><h2>Movie unavailable</h2><p>This title is no longer in the catalogue. You can remove its saved reference.</p><button className="btn btn-outline" disabled={!!pending[entry.key]} onClick={()=>void remove(entry.key)}>Remove from watchlist</button></div>}
   </article>)}</div>}
  </>:null}
  <p className="watchlist-disclaimer">Release information and TMDB Now Playing are movie discovery, not confirmation of screenings in your city. MovieVerse bookings and payments remain simulations.</p>
 </main>;
}
