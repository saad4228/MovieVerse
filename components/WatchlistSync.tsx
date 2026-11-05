"use client";
import {useEffect} from "react";
import {useWatchlist} from "@/lib/watchlist-client";
import {invalidateSession} from "@/lib/client";
export default function WatchlistSync({notify}:{notify:(message:string)=>void}){
 useEffect(()=>{
  let forwarded=false,channel:BroadcastChannel|undefined;
  const refresh=()=>{void useWatchlist.getState().load();};
  const auth=()=>{invalidateSession();void useWatchlist.getState().load(true);if(!forwarded)channel?.postMessage("auth");};
  const notice=(event:Event)=>notify((event as CustomEvent<string>).detail);
  try{channel=new BroadcastChannel("movieverse-watchlist");channel.onmessage=event=>{
   if(event.data==="auth"){forwarded=true;invalidateSession();window.dispatchEvent(new Event("mv-auth"));forwarded=false;}else refresh();
  };}catch{/* Focus refresh remains available. */}
  refresh();window.addEventListener("mv-auth",auth);window.addEventListener("focus",refresh);window.addEventListener("mv-watchlist-notice",notice);
  return()=>{channel?.close();window.removeEventListener("mv-auth",auth);window.removeEventListener("focus",refresh);window.removeEventListener("mv-watchlist-notice",notice);};
 },[notify]);return null;
}
