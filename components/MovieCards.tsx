"use client";
import AssetImage from "@/components/AssetImage";
import {memo,useEffect,useRef,useState,lazy,Suspense,type CSSProperties} from "react";
import Link from "./MovieLink";
import {ArrowRight,Star} from "lucide-react";
import {venues,type Movie} from "@/lib/catalog";
import {useApp} from "@/lib/store";
import {discoveryStatus} from "@/lib/movie-discovery";
import {posterSet} from "@/lib/movie-media";
import WatchlistButton from "./WatchlistButton";
import {Modal} from "./ui";
const MovieVideoPlayer=lazy(()=>import("./video/MovieVideoPlayer"));
export const MovieCard = memo(function MovieCard({
  movie: m,
  index = 0,
  tilt = 0,
  catalogue = false,
}: {
  movie: Movie;
  index?: number;
  tilt?: number;
  catalogue?: boolean;
}) {
  const city = useApp(s=>s.city);
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(m.poster ? "loading" : "error");
  const poster = useRef<HTMLImageElement>(null);
  const originalLanguage = m.originalLanguage ? (() => {
    try { return new Intl.DisplayNames(["en"], { type: "language" }).of(m.originalLanguage) || m.originalLanguage; }
    catch { return m.originalLanguage; }
  })() : "";
  useEffect(() => {
    setImageState(!m.poster ? "error" : poster.current?.complete ? poster.current.naturalWidth ? "loaded" : "error" : "loading");
  }, [m.poster]);
  const bookable = ["now-showing","advance-booking"].includes(discoveryStatus(m,city,venues));
  return (
    <article
      className="movie-card"
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
    >
      <Link href={`/movies/${m.id}`} className={`movie-art poster-${imageState}`}>
        {imageState === "error" && <span className="poster-fallback"><span>{m.title}</span><small>Poster unavailable</small></span>}
        <AssetImage
          ref={poster}
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("error")}
          src={m.poster || undefined}
          srcSet={posterSet(m)}
          sizes="(max-width: 760px) 46vw, 280px"
          alt={`${m.title} movie poster`}
          loading="lazy"
          decoding="async"
        />
        <div className="card-top">
          <span className="card-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" />
            <b>{m.rating || "Not rated"}</b>
            <span>· {m.votes}</span>
          </span>
        </div>
        <div className="card-copy">
          <small>
            {m.certificate} · {m.genre.join(" / ")}
          </small>
          <h3>{m.title}</h3>
          <p>{catalogue ? [m.release?.slice(0,4), originalLanguage || m.languages.slice(0, 3).join(" ? ")].filter(Boolean).join(" ? ") : m.languages.slice(0, 3).join(" ? ")}</p>
          <span className="card-book">
            {!catalogue && bookable ? venues.some(v=>v.cityId===city && v.movieIds.includes(m.id)) ? "Demo booking" : "View partner listing" : "Explore movie"}
            <ArrowRight size={15} />
          </span>
        </div>
      </Link>
      <WatchlistButton movie={m} variant="icon"/>
    </article>
  );
});

export function Trailer({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`${movie.title} trailer`}
      onClose={onClose}
      wide
      variant="trailer"
    >
      <span className="eyebrow">{movie.trailerLabel || "THE BIG PICTURE"}</span>
      <h2>{movie.title}</h2>
      <Suspense fallback={<span className="spinner"/>}><MovieVideoPlayer key={movie.id} movie={movie} /></Suspense>
    </Modal>
  );
}
