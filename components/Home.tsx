"use client";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  MoveUpRight,
  Armchair,
  MapPin,
} from "lucide-react";
import { cities, cityMovies, movies, venues, type Movie } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { SectionTitle, Modal, Empty } from "./ui";
import PosterWall from "./PosterWall";
export function MovieCard({
  movie: m,
  index = 0,
  tilt = 0,
}: {
  movie: Movie;
  index?: number;
  tilt?: number;
}) {
  return (
    <article
      className="movie-card"
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
    >
      <Link href={`/movies/${m.id}`} className="movie-art">
        <img src={m.poster} alt={`${m.title} movie poster`} loading="lazy" />
        <div className="card-top">
          <span className="card-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" />
            <b>{m.rating}</b>
            <span>· {m.votes}</span>
          </span>
        </div>
        <div className="card-copy">
          <small>
            {m.certificate} · {m.genre.join(" / ")}
          </small>
          <h3>{m.title}</h3>
          <p>{m.languages.slice(0, 3).join(" · ")}</p>
          <span className="card-book">
            {m.status === "upcoming" ? "Explore movie" : "Book tickets"}
            <ArrowRight size={15} />
          </span>
        </div>
      </Link>
    </article>
  );
}
export function Trailer({
  movie,
  onClose,
}: {
  movie: Movie;
  onClose: () => void;
}) {
  return (
    <Modal title={`${movie.title} trailer`} onClose={onClose} wide>
      <span className="eyebrow">THE BIG PICTURE</span>
      <h2>{movie.title}</h2>
      {movie.trailer ? (
        <>
          <video
            className="trailer-player"
            controls
            autoPlay
            muted
            playsInline
            poster={movie.backdrop}
            src={movie.trailer}
          />
          <p className="fine-print">
            Sintel © Blender Foundation · Creative Commons Attribution 3.0.
          </p>
        </>
      ) : (
        <div className="trailer-unavailable">
          <img src={movie.poster} alt="" />
          <div>
            <h3>A story worth waiting for.</h3>
            <p>
              An authorised trailer hasn’t been configured for this demo movie
              yet.
            </p>
            <Link
              className="btn btn-gold"
              href="/movies/sintel"
              onClick={onClose}
            >
              Try the sample film
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
export default function Home() {
  const cityId = useApp((s) => s.city);
  const city = cities.find((c) => c.id === cityId)!;
  const [active, setActive] = useState(3);
  const [language, setLanguage] = useState("All");
  const [trailer, setTrailer] = useState<Movie | null>(null);
  const start = useRef(0);
  const dragged = useRef(false);
  const pointer = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const preferred = [
    "vikram",
    "leo",
    "coolie",
    "varanasi",
    "toxic",
    "jailer-2",
    "ramayana",
  ]
    .map((id) => movies.find((m) => m.id === id))
    .filter((m): m is Movie => !!m);
  const panorama = preferred.length ? preferred : movies.slice(0, 7);
  const featured = panorama[active % panorama.length];
  const accent =
    (
      {
        toxic: "#36cfa5",
        leo: "#af86ef",
        coolie: "#efaa4c",
        vikram: "#ed7685",
        varanasi: "#f9be3c",
        "jailer-2": "#78b6ed",
        ramayana: "#e9b65d",
      } as Record<string, string>
    )[featured.id] || featured.accent;
  const rotate = (direction: number) =>
    setActive((a) => (a + direction + panorama.length) % panorama.length);
  const showing = cityMovies(cityId).filter(
    (m) => language === "All" || m.languages.includes(language),
  );
  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    if (pointer.current !== event.pointerId) return;
    if (dragged.current && !cancelled) {
      const step =
        parseFloat(
          getComputedStyle(event.currentTarget).getPropertyValue(
            "--panorama-step",
          ),
        ) || 193;
      const delta = event.clientX - start.current;
      const steps = Math.max(-2, Math.min(2, Math.round(-delta / step)));
      if (Math.abs(delta) > 28) rotate(steps || (delta < 0 ? 1 : -1));
    }
    pointer.current = null;
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <main>
      <section
        className="cinema-lobby"
        aria-label="Interactive movie panorama"
        data-featured-movie={featured.id}
        style={{ "--lobby-accent": accent } as CSSProperties}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowLeft") rotate(-1);
          if (e.key === "ArrowRight") rotate(1);
        }}
      >
        <div className="stars" />
        <div className="planet" />
        <div className="spotlight" />
        <div className="lobby-heading">
          <span className="lobby-kicker">WELCOME TO YOUR NEXT ESCAPE</span>
          <h1>
            MOVIE<span>VERSE</span>
          </h1>
          <p>
            DRAG TO EXPLORE <span>·</span> TAP A SCREEN TO BOOK
          </p>
        </div>
        <div
          className={`panorama ${dragOffset ? "is-dragging" : ""}`}
          style={{ "--drag-offset": `${dragOffset}px` } as CSSProperties}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            start.current = e.clientX;
            dragged.current = false;
            pointer.current = e.pointerId;
          }}
          onPointerMove={(e) => {
            if (pointer.current !== e.pointerId) return;
            if (Math.abs(e.clientX - start.current) > 12) {
              dragged.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragOffset(
                Math.max(-420, Math.min(420, e.clientX - start.current)),
              );
            }
          }}
          onPointerUp={(e) => finishDrag(e)}
          onPointerCancel={(e) => finishDrag(e, true)}
        >
          {panorama.map((m, i) => {
            let d = i - (active % panorama.length);
            if (d > panorama.length / 2) d -= panorama.length;
            if (d < -panorama.length / 2) d += panorama.length;
            return (
              <div
                key={m.id}
                className={`panorama-screen ${d === 0 ? "current" : ""}`}
                style={
                  { "--offset": d, "--distance": Math.abs(d) } as CSSProperties
                }
              >
                <span className="screen-title">{m.title}</span>
                <Link
                  href={`/movies/${m.id}`}
                  onClick={(e) => {
                    if (dragged.current) {
                      e.preventDefault();
                      return;
                    }
                    if (d !== 0) {
                      e.preventDefault();
                      setActive(i);
                    }
                  }}
                  aria-label={`${m.title}${d === 0 ? " — explore and book" : " — bring to centre"}`}
                  draggable={false}
                >
                  <img
                    className="screen-poster"
                    src={m.poster}
                    alt={`${m.title} poster`}
                    draggable={false}
                  />
                  <img
                    className="reflection"
                    src={m.poster}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                  />
                </Link>
              </div>
            );
          })}
        </div>
        <div className="cinema-floor" />
        <div className="lobby-controls">
          <button
            className="round-button"
            aria-label="Previous movie"
            onClick={() => rotate(-1)}
          >
            <ChevronLeft size={21} />
          </button>
          <div className="featured-movie">
            <span className="slide-counter">
              {String((active % panorama.length) + 1).padStart(2, "0")}{" "}
              <span>/ {String(panorama.length).padStart(2, "0")}</span>
            </span>
            <div className="featured-info">
              <span className="booking-status">
                <i />
                {featured.status === "upcoming"
                  ? "COMING TO YOUR UNIVERSE"
                  : "NOW SHOWING · BOOKING OPEN"}
              </span>
              <h2>{featured.title}</h2>
              <p>
                <span className="certificate">{featured.certificate}</span>
                {featured.languages[0]} · {featured.genre.join(", ")} ·{" "}
                {Math.floor(featured.duration / 60)}h {featured.duration % 60}m{" "}
                <span className="gold">★ {featured.rating}</span>
              </p>
            </div>
            <div className="featured-actions">
              <button
                className="btn btn-outline"
                onClick={() => setTrailer(featured)}
              >
                <Play size={12} fill="currentColor" />
                Trailer
              </button>
              <Link className="btn btn-gold" href={`/movies/${featured.id}`}>
                {featured.status === "upcoming" ? "Explore" : "Book tickets"}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <button
            className="round-button"
            aria-label="Next movie"
            onClick={() => rotate(1)}
          >
            <ChevronRight size={21} />
          </button>
        </div>
        <div className="lobby-bottom">
          <span>YOUR UNIVERSE. YOUR MOVIE. YOUR SEAT.</span>
          <a href="#now-showing">
            SCROLL TO DISCOVER<span>↓</span>
          </a>
          <span>AN ENTIRELY NEW POINT OF VIEW</span>
        </div>
      </section>
      <section className="home-showing" id="now-showing">
        <div className="section-container">
          <SectionTitle
            eyebrow="THE BIG SCREEN IS CALLING"
            title={`Now showing in ${city.name}`}
            subtitle="A great story deserves a great seat."
            link="/movies"
            label={`See all (${cityMovies(cityId).length})`}
          />
          <div className="chips" aria-label="Filter by language">
            {[
              "All",
              "Tamil",
              "Telugu",
              "Kannada",
              "Malayalam",
              "Hindi",
              "English",
            ].map((l) => (
              <button
                key={l}
                className={`chip ${l === language ? "selected" : ""}`}
                onClick={() => setLanguage(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="movie-carousel">
          {showing.length ? (
            showing.map((m, i) => (
              <MovieCard
                key={m.id}
                movie={m}
                index={i}
                tilt={(i - (showing.length - 1) / 2) * 2}
              />
            ))
          ) : (
            <Empty title="No films in this language today" />
          )}
        </div>
        <div className="cinema-marquee">
          <div>
            Your seat is <span>waiting.</span> <i>✦</i> Lights down.{" "}
            <span>Phones off.</span> <i>✦</i> Every format.{" "}
            <span>IMAX · 4DX · Atmos.</span> <i>✦</i> Your seat is{" "}
            <span>waiting.</span> <i>✦</i> Lights down. <span>Phones off.</span>{" "}
            <i>✦</i> Every format. <span>IMAX · 4DX · Atmos.</span>
          </div>
        </div>
        <p className="carousel-hint">SWIPE TO EXPLORE · PICK YOUR NEXT STORY</p>
      </section>
      <PosterWall />
      <section className="experience-section section-container">
        <div className="experience-copy">
          <span className="eyebrow">DON’T JUST PICK A SEAT. STEP INSIDE.</span>
          <h2>
            See the screen.
            <br />
            Feel the space.
            <br />
            <span>Find your seat.</span>
          </h2>
          <p>
            Explore your cinema in 3D, try the view from any seat, and find your
            own sweet spot. The best part starts before the opening scene.
          </p>
          <Link href="/movies/sintel#showtimes" className="btn btn-gold">
            Explore a 3D cinema
            <ArrowUpRight size={17} />
          </Link>
          <div className="feature-notes">
            <span>
              <Armchair size={15} /> Preview your view
            </span>
            <span>
              <MapPin size={15} /> Multiple demo layouts
            </span>
          </div>
        </div>
        <div className="experience-image">
          <img
            src="/assets/auditorium.webp"
            alt="An illustrative 3D cinema with individually selectable seats"
            loading="lazy"
          />
          <div className="image-caption">
            <span>
              <i /> A WHOLE NEW PERSPECTIVE
            </span>
            <span>360°</span>
          </div>
        </div>
      </section>
      <section className="section-container coming-section">
        <SectionTitle
          eyebrow="GOOD THINGS ARE COMING"
          title="Worth the wait."
          subtitle="The next chapter of your movie obsession."
          link="/coming-soon"
          label="Coming soon"
        />
        <div className="upcoming-grid">
          {movies
            .filter((m) => m.status === "upcoming")
            .map((m) => (
              <Link
                key={m.id}
                href={`/movies/${m.id}`}
                className="upcoming-card"
              >
                <img src={m.poster} alt={`${m.title} poster`} loading="lazy" />
                <div>
                  <span className="eyebrow">
                    {new Date(m.release).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <h3>{m.title}</h3>
                  <p>{m.tagline}</p>
                  <span className="text-link">
                    Discover the story
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <section className="cinema-callout section-container">
        <div>
          <span className="eyebrow">SAME CITY. NEW EXPERIENCES.</span>
          <h2>
            Your neighbourhood.
            <br />
            Your kind of cinema.
          </h2>
          <p>
            From intimate lounges to larger-than-life IMAX screens.
            <br />
            Explore {venues.filter((v) => v.cityId === cityId).length} demo
            cinemas in {city.name}.
          </p>
        </div>
        <Link href="/cinemas" className="btn btn-gold">
          Discover cinemas
          <ArrowRight size={18} />
        </Link>
      </section>
      {trailer && <Trailer movie={trailer} onClose={() => setTrailer(null)} />}
    </main>
  );
}
