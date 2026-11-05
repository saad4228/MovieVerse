"use client";
import "./watchlist.css";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Heart} from "lucide-react";
import type {Movie} from "@/lib/catalog";
import {watchlistKey} from "@/lib/watchlist-key";
import {useWatchlist,watchlistNotice} from "@/lib/watchlist-client";
export default function WatchlistButton({movie,variant="full"}:{movie:Movie;variant?:"full"|"icon"|"remove"}){
 const key=watchlistKey(movie),saved=useWatchlist(s=>!!s.entries[key]),pending=useWatchlist(s=>!!s.pending[key]),loading=useWatchlist(s=>s.loading);
 const [pulse,setPulse]=useState(0);const router=useRouter();
 const label=variant==="remove"?`Remove ${movie.title} from watchlist`:variant==="icon"?`${saved?"Remove":"Add"} ${movie.title} ${saved?"from":"to"} watchlist`:saved?"In Watchlist":"Add to Watchlist";
 return <button type="button" className={`watchlist-toggle ${variant==="icon"?"watchlist-icon":"btn btn-outline"}${saved?" is-saved":""}`} aria-label={label} title={label} aria-pressed={saved} aria-busy={pending} disabled={loading||pending} onPointerDown={e=>e.stopPropagation()} onClick={async e=>{
  e.preventDefault();e.stopPropagation();setPulse(n=>n+1);
  const result=variant==="remove"?await useWatchlist.getState().remove(key):await useWatchlist.getState().toggle(movie);
  if(result.signin){watchlistNotice("Sign in to save movies to your watchlist.");router.push(`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`);}
 }}><Heart key={pulse} size={variant==="icon"?17:15} className={pulse?"watchlist-heart-pulse":""} fill={saved?"currentColor":"none"}/>{variant!=="icon"&&(variant==="remove"?"Remove":saved?"In Watchlist":"Add to Watchlist")}</button>;
}
