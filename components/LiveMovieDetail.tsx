"use client";
import { useEffect, useState } from "react";
import Link from "./MovieLink";
import MovieBackLink from "./MovieBackLink";
import WatchlistButton from "./WatchlistButton";
import { movies, venues, type Movie } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { discoveryStatus } from "@/lib/movie-discovery";
import MovieInformation, { MovieBackdrop } from "./MovieInformation";
import { TmdbAttribution } from "./TmdbAttribution";

export default function LiveMovieDetail({ id }: { id: string }) {
  const city = useApp(s=>s.city);
  const matched = movies.find(m=>m.metadata?.tmdbId === Number(id.replace(/^tmdb-/,"")));
  const screening = matched && ["now-showing","advance-booking"].includes(discoveryStatus(matched,city,venues));
  const [movie, setMovie] = useState<Movie>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMovie(undefined); setError("");
    fetch(`/api/tmdb-movie?id=${encodeURIComponent(id.replace(/^tmdb-/, ""))}`, { signal: controller.signal }).then(async response => {
      const data = await response.json() as { movie: Movie; error?: string };
      if (!response.ok) throw new Error(data.error || "Movie details are unavailable.");
      if (!controller.signal.aborted) setMovie(data.movie);
    }).catch(error=>{ if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Movie details are unavailable."); });
    return ()=>controller.abort();
  }, [id, attempt]);
  if (!movie) return <main className="section-container empty"><MovieBackLink/><h1>Movie details</h1><p role="status">{error || "Loading movie details…"}</p>{error && <button className="btn btn-outline" onClick={()=>setAttempt(n=>n+1)}>Retry movie details</button>}</main>;
  return <main className="live-movie-detail">
    <section className="live-movie-hero">
      <MovieBackLink/>
      {(movie.backdrop || movie.poster) && <MovieBackdrop movie={{...movie, backdrop:movie.backdrop || movie.poster}}/>}
      <div className="section-container live-movie-heading"><span className="eyebrow">TMDB MOVIE INFORMATION</span><h1>{movie.title}</h1><p>{movie.aliases?.[0] && movie.aliases[0] !== movie.title ? `Original title: ${movie.aliases[0]}` : ""}</p><p>{movie.genre.join(" · ")} · {movie.rating ? `${movie.rating.toFixed(1)} / 10` : "Not rated"}</p>{screening ? <Link className="btn btn-gold" href={`/movies/${matched!.id}#showtimes`}>View available screenings</Link> : <><p>Not currently screening in your city. Catalogue information does not confirm local availability.</p><Link className="btn btn-outline" href="/cinemas">Browse cinemas</Link></>} <WatchlistButton movie={movie}/></div>
    </section>
    <MovieInformation movie={movie} info={movie.metadata}/>
    <section className="section-container"><TmdbAttribution/></section>
  </main>;
}
