"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { GenreCollection, GenreResult } from "@/lib/genre-catalog";
import { loadGenre, peekGenre } from "@/lib/genre-client";
import { MovieCard } from "./MovieCards";
import MovieRail from "./MovieRail";
import { TmdbAttribution } from "./LiveMovieDiscovery";

function useResource<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ url: string | null; data?: T; error?: string }>({ url, data: url ? peekGenre<T>(url) : undefined });
  useEffect(() => {
    if (!url) return;
    let active = true;
    setState({ url, data: peekGenre<T>(url) });
    loadGenre<T>(url).then(data => { if (active) setState({ url, data }); })
      .catch(error => { if (active) setState({ url, error: error instanceof Error ? error.message : "Discovery is temporarily unavailable." }); });
    return () => { active = false; };
  }, [url, attempt]);
  const current = state.url === url ? state : { data: url ? peekGenre<T>(url) : undefined, error: undefined };
  return { ...current, retry: () => setAttempt(n => n + 1) };
}
function Notice({ error, retry }: { error?: string; retry: () => void }) {
  return <div className="genre-notice" role="status"><p>{error || "Finding films for you..."}</p>{error && <button className="text-link" onClick={retry}>Try again</button>}</div>;
}
function GenreRow({ collection }: { collection: GenreCollection }) {
  const root = useRef<HTMLElement>(null);
  const url = `/api/genre-movies?genre=${collection.slug}&preview=true`;
  const [visible, setVisible] = useState(!!peekGenre(url));
  const { data, error, retry } = useResource<GenreResult>(visible ? url : null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <section className="genre-row" id={`genre-${collection.slug}`} ref={root} aria-label={`${collection.name} collection`}>
    <div className="genre-row-heading"><div><h3>{collection.name}</h3><p>{collection.description}</p></div>
      <Link className="text-link" href={`/genres/${collection.slug}`}>View all <ArrowRight size={16}/></Link></div>
    {data ? <><span className="genre-count">{data.movies.length} films loaded in this preview</span>
      {data.movies.length ? <MovieRail label={collection.name}>{data.movies.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} catalogue/>)}</MovieRail> : <p>No films are available in this collection yet.</p>}</>
      : <Notice error={error} retry={retry}/>}
  </section>;
}
export function GenreDiscovery() {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(!!peekGenre("/api/movie-genres"));
  const [active, setActive] = useState("");
  const { data, error, retry } = useResource<{ collections: GenreCollection[] }>(visible ? "/api/movie-genres" : null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "400px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <section className="genre-discovery" id="explore-genres" ref={root}>
    <header><span className="eyebrow">EXPLORE BY GENRE</span><h2>Discover films that match your mood.</h2><p>Explore cinema from around the world. Catalogue titles do not imply local screenings.</p></header>
    {data ? <><nav className="genre-shortcuts chips" aria-label="Genre shortcuts">{data.collections.map(collection=><button key={collection.slug} className={`chip ${active===collection.slug ? "selected" : ""}`} aria-pressed={active===collection.slug} onClick={()=>{setActive(collection.slug);document.getElementById(`genre-${collection.slug}`)?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}}>{collection.name}</button>)}</nav>{data.collections.map(collection => <GenreRow key={collection.slug} collection={collection}/>)}<TmdbAttribution/></> : <Notice error={error} retry={retry}/>}
  </section>;
}
const languages = [["hi","Hindi"],["ta","Tamil"],["te","Telugu"],["ml","Malayalam"],["kn","Kannada"],["mr","Marathi"],["bn","Bengali"],["en","English"],["ko","Korean"],["ja","Japanese"],["fr","French"],["es","Spanish"]];
const countries = [["IN","India"],["US","United States"],["GB","United Kingdom"],["KR","South Korea"],["JP","Japan"],["FR","France"],["ES","Spain"]];
export function GenrePage({ slug }: { slug: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const filters = useRef(params.toString());
  const { data: genres } = useResource<{collections:GenreCollection[]}>("/api/movie-genres");
  useEffect(()=>{
    const restore=()=>{filters.current=window.location.search.slice(1);};
    window.addEventListener("popstate",restore);
    return ()=>window.removeEventListener("popstate",restore);
  },[]);
  const query = new URLSearchParams();
  query.set("genre", slug);
  for (const key of ["page", "sort", "language", "country", "year", "q"]) {
    const value = params.get(key); if (value) query.set(key, value);
  }
  const url = `/api/genre-movies?${query}`;
  const { data, error, retry } = useResource<GenreResult>(url);
  const [search, setSearch] = useState(params.get("q") || "");
  const top = useRef<HTMLDivElement>(null);
  function change(key: string, value: string) {
    const next = new URLSearchParams(filters.current);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    filters.current = next.toString();
    router.replace(`/genres/${slug}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  useEffect(() => { setSearch(params.get("q") || ""); }, [params]);
  return <main className="discovery-page section-container genre-page">
    <Link className="back-link" href="/movies#explore-genres"><ChevronLeft size={16}/>Back to movies</Link>
    <div className="page-intro"><span className="eyebrow">EXPLORE BY GENRE</span><h1>{data?.collection.name || slug.replaceAll("-", " ")}</h1><p>{data?.collection.description || "Discover films that match your mood."}</p></div>
    <div className="genre-filters" ref={top}>
      {genres && <label>Genre<select aria-label="Choose genre" value={slug} onChange={e=>router.push(`/genres/${e.target.value}${params.size?`?${params}`:""}`)}>{genres.collections.map(g=><option key={g.slug} value={g.slug}>{g.name}</option>)}</select></label>}
      <form onSubmit={e => { e.preventDefault(); change("q", search.trim()); }}><label>Search this genre<input aria-label="Search this genre" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Movie title"/></label><button className="btn btn-outline" type="submit">Search</button></form>
      <label>Sort<select aria-label="Genre sort" disabled={!!params.get("q")} value={params.get("sort") || "popular"} onChange={e => change("sort",e.target.value)}><option value="popular">Popular</option><option value="rated">Top rated</option><option value="classic">Classics - before 2000</option><option value="recent">Recent releases</option></select></label>
      <label>Original language<select aria-label="Original language" value={params.get("language") || ""} onChange={e=>change("language",e.target.value)}><option value="">All languages</option>{languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
      <label>Country of origin<select aria-label="Country of origin" value={params.get("country") || ""} onChange={e=>change("country",e.target.value)}><option value="">Worldwide</option>{countries.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
      <label>Release year<input aria-label="Release year" type="number" min="1880" max="2100" placeholder="Any year" defaultValue={params.get("year") || ""} key={params.get("year") || "any"} onBlur={e=>{if(e.target.validity.valid)change("year",e.target.value);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/></label>
      <button className="text-link" onClick={()=>{filters.current="";router.replace(`/genres/${slug}`,{scroll:false});}}>Clear filters</button>
    </div>
    <p className="genre-explanation">Country and original language are separate filters. Discovery does not confirm screenings in your city.</p>
    {data?.searchFiltered && <p className="genre-explanation">Search results are filtered within each provider page. Some pages may have no matches; use Next to explore further. Search uses provider relevance.</p>}
    {data ? <><p className="genre-count" aria-live="polite">{data.totalResults?.toLocaleString() || data.movies.length} catalogue results | page {data.page} of {Math.max(1,data.totalPages)}</p>
      {data.movies.length ? <div className="movie-grid">{data.movies.map((movie,index)=><MovieCard key={movie.id} movie={movie} index={index} catalogue/>)}</div> : <div className="genre-notice">No matching films on this page. Try another page or adjust your filters.</div>}
      <nav className="genre-pagination" aria-label="Genre pages"><button className="btn btn-outline" disabled={data.page<=1} onClick={()=>{change("page",String(data.page-1));top.current?.scrollIntoView({block:"start"});}}>Previous page</button><span>{data.page} / {Math.max(1,data.totalPages)}</span><button className="btn btn-outline" disabled={data.page>=data.totalPages} onClick={()=>{change("page",String(data.page+1));top.current?.scrollIntoView({block:"start"});}}>Next page</button></nav>
      <TmdbAttribution/></> : <Notice error={error} retry={retry}/>}
  </main>;
}
