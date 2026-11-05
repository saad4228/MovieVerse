"use client";
import { useEffect, useState } from "react";
import Link from "./MovieLink";
import type { Movie } from "@/lib/catalog";
import type { MovieDiscoveryResult, DiscoveryQuery } from "@/lib/tmdb";
import MovieRail from "./MovieRail";

export function TmdbAttribution() {
  return <aside className="metadata-credit tmdb-attribution" aria-label="TMDB credits">
    <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><img src="/assets/tmdb-logo.svg" alt="TMDB" width={100} height={13}/></a>
    <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
  </aside>;
}
const labels = { trending: "Trending movies", "now-playing": "Now playing in India", upcoming: "Coming soon in India", popular: "Popular movies", "top-rated": "Top rated movies" };
function LiveSection({ section, language }: { section: DiscoveryQuery["section"]; language: string }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data?: MovieDiscoveryResult; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => { setPage(1); }, [language]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetch(`/api/movie-discovery?section=${section}&page=${page}&language=${language}`, { signal: controller.signal }).then(async response => {
      const data = await response.json() as MovieDiscoveryResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Movie discovery is unavailable.");
      if (!controller.signal.aborted) setState({ loading: false, data });
    }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, error: error instanceof Error ? error.message : "Movie discovery is unavailable." }); });
    return () => controller.abort();
  }, [section, page, language, attempt]);
  return <section className="discovery-section live-movie-section" aria-label={`TMDB ${labels[section]}`}>
    <div className="film-section-heading"><div><span className="eyebrow">TMDB MOVIE DISCOVERY</span><h2>{labels[section]}</h2></div></div>
    <p className="muted">{section === "trending" ? "Global TMDB trends; translated for India. Trending does not confirm an Indian theatrical release." : "India release market. Movie metadata does not confirm screenings in your city."}</p>
    {state.loading ? <p role="status">Loading movie discovery…</p> : state.error ? <div role="status"><p>{state.error}</p><button className="text-link" onClick={()=>setAttempt(n=>n+1)}>Retry movie discovery</button></div> : <>
      {state.data?.movies.length ? <MovieRail label={`TMDB ${labels[section]} carousel`}>
        {state.data.movies.map((movie: Movie) => <article className="movie-card" key={movie.id}>
          <Link href={`/movies/${movie.id}`} className="movie-art">
            {movie.poster ? <img src={movie.poster} alt={`${movie.title} poster`} loading="lazy"/> : <span className="empty">Poster not supplied</span>}
            <div className="card-top"><span className="rating">{movie.rating ? `${movie.rating.toFixed(1)} / 10` : "Not rated"}</span></div>
            <div className="card-copy"><small>{movie.genre.join(" / ")}</small><h3>{movie.title}</h3><p>{movie.release || "Release date not supplied"}</p><span className="card-book">Explore movie →</span></div>
          </Link>
        </article>)}
      </MovieRail> : <p>No movies returned for this section.</p>}
      <div className="live-discovery-pagination"><button className="btn btn-outline" disabled={page===1} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page} of {state.data?.totalPages || 1}</span><button className="btn btn-outline" disabled={page >= (state.data?.totalPages || 0)} onClick={()=>setPage(n=>n+1)}>Next</button></div>
      <p className="fine-print">TMDB data fetched {state.data?.fetchedAt ? new Date(state.data.fetchedAt).toLocaleString("en-IN") : ""}.</p>
    </>}
  </section>;
}
export default function LiveMovieDiscovery({ sections = ["trending", "now-playing", "upcoming"] }: { sections?: DiscoveryQuery["section"][] }) {
  const [language, setLanguage] = useState("en-IN");
  return <div className="section-container live-movie-discovery">
    <label className="sort-label">Movie information language <select aria-label="TMDB language" value={language} onChange={event=>setLanguage(event.target.value)}><option value="en-IN">English (India)</option><option value="hi-IN">Hindi (India)</option></select></label>
    {sections.map(section=><LiveSection key={`${section}-${language}`} section={section} language={language}/>)}
    <TmdbAttribution/>
  </div>;
}
