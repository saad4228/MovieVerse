"use client";
import { useRef, type CSSProperties } from "react";
import {useDiscoveryHome} from "@/lib/discovery-client";
import type {Movie} from "@/lib/catalog";

/** Snapshot catalogue art once so switching forms never rearranges the scene. */
export default function AuthPosterCollage() {
  const {data}=useDiscoveryHome();
  const snapshot=useRef<Movie[]|null>(null);
  const movies=data?.collections.popular??[];
  const posters = (() => {
    if(snapshot.current)return snapshot.current;
    const unique = [...new Map(movies.filter(movie => movie.poster).map(movie => [movie.poster, movie])).values()];
    const english = unique.filter(movie => movie.languages.includes("English"));
    const regional = unique.filter(movie => !movie.languages.includes("English"));
    const result = [] as typeof unique;
    for (let i = 0; i < Math.max(english.length, regional.length); i++) {
      if (regional[i]) result.push(regional[i]);
      if (english[i]) result.push(english[i]);
    }
    const selection=result.slice(0,16);
    if(selection.length)snapshot.current=selection;
    return selection;
  })();
  return <div className="auth-collage" aria-hidden="true">
    <div className="auth-poster-installation">
      {posters.map((movie, index) => <div className={`auth-poster depth-${index % 3}`} key={movie.id} style={{"--poster-angle": `${[-5, 4, -2, 6][index % 4]}deg`, "--poster-offset": `${[0, -22, 18, -8][index % 4]}px`} as CSSProperties}>
        <img src={movie.poster} width={400} height={600} alt="" decoding="async" loading={index < 8 ? "eager" : "lazy"} fetchPriority={index < 2 ? "high" : "auto"} onError={e => { e.currentTarget.style.visibility = "hidden"; }}/>
      </div>)}
    </div>
  </div>;
}
