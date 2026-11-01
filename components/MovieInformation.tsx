"use client";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/catalog";
import { bundledInformation, personPhoto, releaseLabel, type MovieInformation as Information } from "@/lib/movie-information";
import { movieImageProvider } from "@/lib/image-provider";
import { trailerSources } from "@/lib/video/sources";
const cache = new Map<string, {expires:number; value:Promise<Information | undefined>}>();
export function useMovieInformation(movie?:Movie) {
  const [info,setInfo] = useState(movie?.metadata || (movie && bundledInformation(movie.id)));
  useEffect(() => {
    if (!movie) return;
    let active = true;
    const seed = movie.metadata || bundledInformation(movie.id);
    setInfo(seed);
    let entry = cache.get(movie.id);
    if (!entry || entry.expires < Date.now()) {
      entry = {expires:Date.now()+3600000,value:fetch(`/api/movie-information?id=${encodeURIComponent(movie.id)}`).then(async r => r.ok ? await r.json() as { metadata?: Information } : { metadata: seed }).then(d => d.metadata || seed).catch(() => seed)};
      cache.set(movie.id,entry);
    }
    entry.value.then(value => { if(active) setInfo(value); });
    return () => { active=false; };
  },[movie?.id]);
  return info;
}
export function MovieBackdrop({ movie }: { movie:Movie }) {
  const images = movieImageProvider.resolve(movie);
  const [index,setIndex] = useState(0);
  const choices=[images.backdrop,...images.alternatives,images.poster];
  const poster = (index === choices.length-1 && index > 0) || movie.backdrop===movie.poster || !!(images.width && images.height && images.width<images.height);
  return <div className={`movie-backdrop ${poster ? "poster-composition" : ""}`}>
    <img src={choices[index]} srcSet={index===0 ? images.srcSet : undefined} sizes="100vw" alt="" fetchPriority="high" style={{objectPosition:images.position}} onError={() => setIndex(i=>Math.min(i+1,choices.length-1))}/>
  </div>;
}
export default function MovieInformation({ movie, info }: { movie:Movie; info?:Information }) {
  const [expanded,setExpanded]=useState(false);
  const [allCast,setAllCast]=useState(false);
  const overview=info?.overview || movie.description;
  const text=info?.story ? `${overview}\n\n${info.story}` : overview;
  const people=info?.cast || [];
  return <div className="film-information section-container">
    <section className="film-story">
      <div><span className="eyebrow">BEHIND THE STORY</span><h2>{movie.tagline}</h2>
        <p className={`film-synopsis ${expanded ? "expanded" : ""}`}>{text}</p>
        {text.length>280 && <button className="text-link" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"Read less":"Read full synopsis"}</button>}
      </div>
      <dl className="film-facts"><div><dt>RELEASE · INDIA</dt><dd>{releaseLabel({...movie,metadata:info})}</dd></div><div><dt>LANGUAGES</dt><dd>{movie.languages.join(" · ")}</dd></div><div><dt>RUNTIME</dt><dd>{movie.duration ? `${movie.duration} minutes` : "To be announced"}</dd></div><div><dt>PRODUCTION</dt><dd>{info?.production.join(" · ") || "Not confirmed"}</dd></div></dl>
    </section>
    {people.length>0 && <section className="film-credits"><div className="film-section-heading"><div><span className="eyebrow">THE PEOPLE BEHIND THE CHARACTERS</span><h2>Meet the cast.</h2></div>{people.length>6 && <button className="text-link" onClick={()=>setAllCast(!allCast)}>{allCast?"Show featured cast":`Show all ${people.length}`}</button>}</div>
      <div className={`cast-strip ${allCast?"cast-expanded":""}`}>{people.slice(0,allCast?undefined:8).map((p,i)=><article className="person-card" key={`${p.id}-${i}`} data-person-id={p.id}>
        <div className="person-photo"><span aria-hidden="true">{p.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span>{personPhoto(p) && <img src={personPhoto(p)} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>}</div><h3>{p.name}</h3><p>{p.character || "Character not announced"}</p>
      </article>)}</div></section>}
    {!!info?.crew.length && <section className="film-crew"><span className="eyebrow">CRAFTED FOR THE BIG SCREEN</span><h2>The filmmakers.</h2><div className="crew-grid">{info.crew.map((p,i)=><article key={`${p.id}-${p.job}-${i}`}><span>{p.job}</span><h3>{p.name}</h3></article>)}</div></section>}
    {!!movie.alternativeBackdrops?.length && <section><h3>A closer look</h3><div className="film-stills">{movie.alternativeBackdrops.slice(0,2).map((src,i)=><a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`${movie.title} promotional artwork ${i+1}`} loading="lazy"/></a>)}</div></section>}
    {!!info?.releaseDates.length && <section className="release-markets"><h3>Release information</h3>{info.releaseDates.map((r,i)=><p key={i}><strong>{r.region === "IN" ? "India" : r.region === "US" ? "United States" : r.region}</strong><span>{r.date || "Date not confirmed"}{r.status === "unconfirmed" ? " · unconfirmed" : ""}</span></p>)}</section>}
    {trailerSources(movie).length>1 && <section className="film-media-gallery"><h3>Trailers & teasers</h3>{trailerSources(movie).filter(t=>t.provider==="youtube" || t.provider==="other").map(t=><a key={t.id} href={t.url} target="_blank" rel="noreferrer">{t.type.replaceAll("-"," ")} {t.language?`· ${t.language}`:""} ↗</a>)}</section>}
    {info && <p className="metadata-credit">Movie information: {info.sources.map((s,i)=><a key={s} href={s} target="_blank" rel="noreferrer">{i?" · ":""}{new URL(s).hostname.replace("www.","")}</a>)} · Checked {info.checked}. Profiles from TMDB; images belong to their respective rights holders.</p>}
  </div>;
}
