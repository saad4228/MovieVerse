"use client";
import {useEffect,useState} from "react";
import type {catalogueHome,CataloguePage} from "./catalogue-read";
import {loadGenre,peekGenre} from "./genre-client";
import {subscribeVisibleRefresh} from "./visible-refresh";
export type HomeCatalogue=Awaited<ReturnType<typeof catalogueHome>>;
export function useCatalogueResource<T>(url:string,enabled=true){
 const [attempt,setAttempt]=useState(0),[state,setState]=useState<{url:string;data?:T;error?:string}>({url,data:peekGenre<T>(url)});
 useEffect(()=>{
  if(!enabled)return;
  let active=true;const load=()=>{if(document.hidden)return;loadGenre<T>(url).then(data=>{if(active)setState(old=>old.url===url&&old.data===data&&!old.error?old:{url,data});}).catch(()=>{if(active)setState(old=>({url,data:old.url===url?old.data:peekGenre<T>(url),error:"Movie discovery is temporarily unavailable. Your last loaded collection is preserved."}));});};
  load();const unsubscribe=subscribeVisibleRefresh(load);
  return()=>{active=false;unsubscribe();};
 },[url,attempt,enabled]);
 return {...(state.url===url?state:{url,data:peekGenre<T>(url)}),retry:()=>setAttempt(n=>n+1)};
}
export const useDiscoveryHome=(enabled=true)=>useCatalogueResource<HomeCatalogue>("/api/discovery-home",enabled);
export const useCataloguePage=(query:string)=>useCatalogueResource<CataloguePage>(`/api/catalogue?${query}`);
export function useMovieSearch(query:string,enabled=true){
 const [debounced,setDebounced]=useState(query);
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(query),180);return()=>clearTimeout(timer);},[query]);
 return useCatalogueResource<CataloguePage>(`/api/catalogue-search?q=${encodeURIComponent(debounced)}`,enabled&&!!debounced.trim());
}
