"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  SlidersHorizontal,
  Star,
  Play,
  Volume2,
  ChevronLeft,
  Heart,
  Armchair,
  Accessibility,
  Car,
  Utensils,
  Clock,
  Building2,
  Check,
} from "lucide-react";
import {
  cities,
  cityMovies,
  dates,
  movies,
  venues,
  showsFor,
  type Movie,
  type Venue,
  type Show,
} from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { rupees } from "@/lib/booking";
import { SectionTitle, Empty } from "./ui";
import { MovieCard, Trailer } from "./Home";
import HeroPreview from "./HeroPreview";
import { posterSet } from "@/lib/movie-media";
import CityCinemaListings from "./CityCinemaListings";
const amenities: Record<string, typeof Car> = {
  Parking: Car,
  "Wheelchair access": Accessibility,
  Recliners: Armchair,
  "Food court": Utensils,
};
export function MovieDiscovery({ upcoming = false }: { upcoming?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const city = useApp((s) => s.city);
  const [language, setLanguage] = useState(params.get("language") || "All");
  const [genre, setGenre] = useState(params.get("genre") || "All genres");
  const [format, setFormat] = useState("All formats");
  const [sort, setSort] = useState("Recommended");
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState("Any rating");
  useEffect(() => {
    setLanguage(params.get("language") || "All");
    setGenre(params.get("genre") || "All genres");
  }, [params]);
  const list = (
    upcoming ? movies.filter((m) => m.status === "upcoming") : cityMovies(city)
  )
    .filter(
      (m) =>
        (language === "All" || m.languages.includes(language)) &&
        (genre === "All genres" || m.genre.includes(genre)) &&
        (format === "All formats" || m.formats.includes(format)) &&
        (minRating === "Any rating" || m.rating >= 8.5) &&
        m.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Top rated"
        ? b.rating - a.rating
        : sort === "A–Z"
          ? a.title.localeCompare(b.title)
          : sort === "Shortest first"
            ? a.duration - b.duration
            : 0,
    );
  const changeLanguage = (l: string) => {
    setLanguage(l);
    const p = new URLSearchParams(params.toString());
    if (l === "All") p.delete("language");
    else p.set("language", l);
    router.replace(
      `${upcoming ? "/coming-soon" : "/movies"}${p.size ? "?" + p : ""}`,
      { scroll: false },
    );
  };
  return (
    <main className="discovery-page section-container">
      <div className="page-intro">
        <span className="eyebrow">
          {upcoming ? "YOUR NEXT OBSESSION" : "MAKE IT A MOVIE DAY"}
        </span>
        <h1>
          {upcoming ? (
            "Coming to your universe."
          ) : (
            <>
              Now showing in{" "}
              <span>{cities.find((c) => c.id === city)!.name}.</span>
            </>
          )}
        </h1>
        <p>
          {upcoming
            ? "Big stories. Bigger things to look forward to."
            : "Find your film. Pick your cinema. Make a memory."}
        </p>
      </div>
      <div className="discovery-toolbar">
        <div className="chips">
          {["All", "Tamil", "Telugu", "Hindi", "Kannada", "English"].map(
            (l) => (
              <button
                key={l}
                className={`chip ${l === language ? "selected" : ""}`}
                onClick={() => changeLanguage(l)}
              >
                {l}
              </button>
            ),
          )}
        </div>
        <label className="sort-label">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {["Recommended", "Top rated", "A–Z", "Shortest first"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-row">
        <SlidersHorizontal size={16} />
        <input
          className="filter-search"
          aria-label="Search movie titles"
          placeholder="Find a movie…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          {[
            "All genres",
            "Action",
            "Thriller",
            "Adventure",
            "Mythology",
            "Drama",
            "Animation",
            "Spy",
            "Crime",
            "Gangster",
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="Filter format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {["All formats", "2D", "IMAX", "Dolby Atmos"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          aria-label="Minimum rating"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
        >
          <option>Any rating</option>
          <option>8.5 and above</option>
        </select>
        <span className="muted results-count">{list.length} films</span>
      </div>
      {list.length ? (
        <div className="movie-grid">
          {list.map((m, i) => (
            <MovieCard movie={m} key={m.id} index={i} />
          ))}
        </div>
      ) : (
        <Empty title="No movies match your mood">
          Try another language or reset your filters.{" "}
          <button
            className="text-link"
            onClick={() => {
              changeLanguage("All");
              setGenre("All genres");
              setFormat("All formats");
              setQuery("");
              setMinRating("Any rating");
            }}
          >
            Reset filters
          </button>
        </Empty>
      )}
      <p className="demo-note">
        Curated demonstration catalog. Ratings, release dates and screenings are
        sample data.
      </p>
    </main>
  );
}
function DateStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="date-strip" aria-label="Choose screening date">
      {dates().map((d, i) => (
        <button
          key={d}
          className={`date-button ${selected === d ? "selected" : ""}`}
          aria-pressed={selected === d}
          onClick={() => onSelect(d)}
        >
          <span>
            {i === 0
              ? "TODAY"
              : i === 1
                ? "TOMORROW"
                : new Date(d + "T12:00:00+05:30").toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
          </span>
          <strong>{d.slice(-2)}</strong>
          <small>
            {new Date(d + "T12:00:00+05:30").toLocaleDateString("en-IN", {
              month: "short",
            })}
          </small>
        </button>
      ))}
    </div>
  );
}
export function Showtimes({ movie, venue }: { movie?: Movie; venue?: Venue }) {
  const city = useApp((s) => s.city);
  const [date, setDate] = useState(dates()[0]);
  const [format, setFormat] = useState("All formats");
  const [period, setPeriod] = useState("All times");
  const [language, setLanguage] = useState("All languages");
  const [maxPrice, setMaxPrice] = useState("Any price");
  const [sort, setSort] = useState("Recommended");
  const router = useRouter();
  const setShow = useApp((s) => s.setShow);
  const [query, setQuery] = useState("");
  useEffect(() => {
    setDate(dates()[0]);
    setFormat("All formats");
    setLanguage("All languages");
  }, [city, movie?.id, venue?.id]);
  function choose(show: Show) {
    setShow(show.id);
    router.push(`/booking/${encodeURIComponent(show.id)}/seats`);
  }
  const relevant = venue
    ? [venue]
    : venues.filter(
        (v) =>
          v.cityId === city &&
          (!movie || v.movieIds.includes(movie.id)) &&
          `${v.name} ${v.locality}`.toLowerCase().includes(query.toLowerCase()),
      );
  const filterShows = (shows: Show[]) =>
    shows.filter(
      (s) =>
        (format === "All formats" || s.format === format) &&
        (language === "All languages" || s.language === language) &&
        (maxPrice === "Any price" || s.price <= 200) &&
        (period === "All times" ||
          (period === "Before 6 PM" ? s.time < "18:00" : s.time >= "18:00")),
    );
  const listings = relevant
    .flatMap((v) =>
      (movie ? [movie] : movies.filter((m) => v.movieIds.includes(m.id))).map(
        (m) => ({ v, m, shows: filterShows(showsFor(v, m.id, date)) }),
      ),
    )
    .filter((x) => x.shows.length > 0)
    .sort((a, b) =>
      sort === "Nearest"
        ? a.v.distance - b.v.distance
        : sort === "Lowest price"
          ? a.v.price - b.v.price
          : sort === "Most shows"
            ? b.shows.length - a.shows.length
            : 0,
    );
  return (
    <section className="showtimes-section section-container" id="showtimes">
      <SectionTitle
        eyebrow="YOUR NEXT PLAN, SORTED"
        title={
          movie
            ? `Catch ${movie.title} in ${cities.find((c) => c.id === city)!.name}`
            : "A screen for every story."
        }
        subtitle="Choose your show. We’ll save the good seats for you."
      />
      <div className="showtime-top">
        <DateStrip selected={date} onSelect={setDate} />
        <span className="demo-badge">DEMO SCREENINGS</span>
      </div>
      <div className="filter-row">
        <SlidersHorizontal size={16} />
        {!venue && (
          <input
            className="filter-search"
            aria-label="Filter cinemas"
            placeholder="Search cinemas or locality…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <select
          aria-label="Show format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {["All formats", "2D", "IMAX"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Show language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {[
            "All languages",
            ...new Set((movie ? [movie] : movies).map((m) => m.languages[0])),
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Showtime period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {["All times", "Before 6 PM", "After 6 PM"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Maximum ticket price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        >
          <option>Any price</option>
          <option>From ₹200 or less</option>
        </select>
      </div>
      <div className="showtime-legend">
        <span>
          <i /> Available
        </span>
        <span>
          <i className="amber" /> Filling fast
        </span>
        <span>All showtimes in IST</span>
        {!venue && (
          <label className="showtime-sort">
            Sort by
            <select
              aria-label="Sort showtime cinemas"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {["Recommended", "Nearest", "Lowest price", "Most shows"].map(
                (option) => (
                  <option key={option}>{option}</option>
                ),
              )}
            </select>
          </label>
        )}
      </div>
      <div
        className="showtime-list"
        key={`${city}-${date}-${format}-${language}-${period}`}
      >
        {listings.map(({ v, m, shows }, i) => (
          <article className="showtime-row" key={v.id + m.id}>
            <div className="showtime-venue">
              {!venue && (
                <span className="venue-monogram" aria-hidden="true">
                  {v.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
              {venue && <img src={m.poster} alt="" />}
              <div>
                {!venue && (
                  <span className="venue-eyebrow">
                    {v.formats.includes("IMAX")
                      ? "IMAX EXPERIENCE"
                      : "A MOVIEVERSE DEMO VENUE"}
                  </span>
                )}
                <Link href={venue ? `/movies/${m.id}` : `/cinemas/${v.id}`}>
                  <h3>
                    {venue ? m.title : v.name}
                    <ArrowUpRight size={14} />
                  </h3>
                </Link>
                <p>
                  {venue
                    ? `${m.certificate} · ${m.duration} min · ${m.genre.join(" / ")}`
                    : `${v.locality} · ${v.distance} km away`}
                </p>
                <span className="venue-facilities">
                  <Utensils size={12} />
                  Food & beverages
                  <Accessibility size={13} />
                  Accessible
                </span>
              </div>
            </div>
            <div className="showtime-slots">
              {shows.map((s, j) => (
                <button
                  key={s.id}
                  className={`time-slot ${(i + j) % 3 === 2 ? "filling" : ""}`}
                  onClick={() => choose(s)}
                  aria-label={`${s.time} ${m.title} at ${v.name}`}
                >
                  <strong>
                    {new Date(`${date}T${s.time}:00+05:30`).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kolkata",
                      },
                    )}
                  </strong>
                  <span>
                    {s.format} · {s.language}
                  </span>
                  <small>from {rupees(s.price)}</small>
                </button>
              ))}
            </div>
            <p className="showtime-disclaimer">
              Cancellation available before showtime · Sample availability
            </p>
          </article>
        ))}
      </div>
      {!listings.length && (
        <Empty title="No screenings for these filters">
          Try another format, language, time, or date.
        </Empty>
      )}
      {movie && !venue && (
        <CityCinemaListings city={city} movie={movie.id} date={date} />
      )}
    </section>
  );
}
export function MovieDetail({
  id,
  notify,
}: {
  id: string;
  notify: (s: string) => void;
}) {
  const m = movies.find((m) => m.id === id);
  const city = useApp((s) => s.city);
  const [trailer, setTrailer] = useState(false);
  const [saved, setSaved] = useState(false);
  const available = m && cityMovies(city).some((x) => x.id === m.id);
  useEffect(() => {
    try {
      setSaved(
        JSON.parse(localStorage.getItem("mv-watchlist") || "[]").includes(id),
      );
    } catch {
      setSaved(false);
    }
  }, [id]);
  if (!m)
    return (
      <main className="section-container">
        <Empty title="This movie isn’t in our universe">
          <Link href="/movies" className="text-link">
            Explore all movies
          </Link>
        </Empty>
      </main>
    );
  return (
    <main>
      <section
        className={`movie-hero ${m.id === "sintel" ? "sample-film" : ""}`}
        style={{ backgroundImage: `url(${m.backdrop})` }}
      >
        {(m.trailer || m.youtubeId) && (
          <HeroPreview movie={m} suspended={trailer} />
        )}
        <div className="movie-hero-shade" />
        <Link href="/movies" className="back-link">
          <ChevronLeft size={16} />
          Back to movies
        </Link>
        <div className="movie-hero-bottom">
          <div className="movie-identity">
            <img
              src={m.poster}
              srcSet={posterSet(m)}
              sizes="160px"
              className="detail-poster"
              alt={`${m.title} poster`}
            />
            <div>
              <div className="movie-kicker">
                <span>
                  {m.status === "upcoming"
                    ? "COMING SOON"
                    : "THE BIG SCREEN AWAITS"}
                </span>
                <span className="certificate">{m.certificate}</span>
                <span>
                  {m.languages.slice(0, 2).join(" · ")} ·{" "}
                  {Math.floor(m.duration / 60)}h {m.duration % 60}m
                </span>
              </div>
              <h1>{m.title}</h1>
              <p>
                <strong className="movie-rating">
                  <Star size={15} fill="currentColor" />
                  {m.rating}
                </strong>
                <span>{m.genre.join(" · ")}</span>
                <span>{m.cast.slice(0, 2).join(", ")}</span>
              </p>
            </div>
          </div>
          <div className="movie-hero-actions">
            <button
              className="btn btn-outline"
              onClick={() => setTrailer(true)}
            >
              <Play size={14} fill="currentColor" />
              {m.trailer ? "Play trailer" : "Trailer preview"}
            </button>
            {m.status === "showing" && available ? (
              <a className="btn btn-gold" href="#showtimes">
                Book tickets ↓
              </a>
            ) : (
              <button
                className="btn btn-gold"
                onClick={() => {
                  const next = !saved;
                  setSaved(next);
                  try {
                    const ids = JSON.parse(
                      localStorage.getItem("mv-watchlist") || "[]",
                    );
                    localStorage.setItem(
                      "mv-watchlist",
                      JSON.stringify(
                        next
                          ? [...new Set([...ids, m.id])]
                          : ids.filter((x: string) => x !== m.id),
                      ),
                    );
                    notify(
                      next
                        ? "Added to your watchlist on this device."
                        : "Removed from your watchlist.",
                    );
                  } catch {
                    notify("Your browser couldn’t save the watchlist.");
                  }
                }}
              >
                {saved ? <Check size={16} /> : <Heart size={16} />}{" "}
                {saved ? "On your watchlist" : "Add to watchlist"}
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="movie-about section-container">
        <div>
          <span className="eyebrow">BEHIND THE STORY</span>
          <h2>{m.tagline}</h2>
          <p>{m.description}</p>
          <div className="chips">
            {m.formats.map((f) => (
              <span className="chip static" key={f}>
                {f}
              </span>
            ))}
            <span className="chip static">{m.genre.join(" · ")}</span>
          </div>
        </div>
        <div className="movie-facts">
          <div>
            <span>STARRING</span>
            <strong>{m.cast.slice(0, 2).join(" · ")}</strong>
          </div>
          <div>
            <span>{m.id === "sintel" ? "CREATED BY" : "FILMMAKER"}</span>
            <strong>{m.cast.at(-1)}</strong>
          </div>
          <div>
            <span>DEMO RELEASE</span>
            <strong>
              {new Date(m.release).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
        </div>
      </section>
      {m.status === "showing" ? (
        available ? (
          <Showtimes key={city + m.id} movie={m} />
        ) : (
          <section className="section-container">
            <Empty
              title={`Not screening in ${cities.find((c) => c.id === city)!.name} today`}
            >
              Choose another city from the header or{" "}
              <Link href="/movies" className="text-link">
                explore available movies.
              </Link>
            </Empty>
          </section>
        )
      ) : (
        <section className="upcoming-info section-container">
          <span className="eyebrow">A LITTLE ANTICIPATION GOES A LONG WAY</span>
          <h2>The next big thing is on its way.</h2>
          <p>
            Demo release:{" "}
            {new Date(m.release).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Showtimes will appear here when screenings are configured.
          </p>
          <Link href="/movies" className="btn btn-gold">
            Discover what’s showing
            <ArrowRight size={16} />
          </Link>
        </section>
      )}
      {trailer && <Trailer movie={m} onClose={() => setTrailer(false)} />}
    </main>
  );
}
export function CinemaDiscovery() {
  const city = useApp((s) => s.city);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("All formats");
  const [amenity, setAmenity] = useState("All amenities");
  const [sort, setSort] = useState("Popular");
  const [locality, setLocality] = useState("All localities");
  const [distance, setDistance] = useState("Any distance");
  const [movie, setMovie] = useState("All movies");
  useEffect(() => {
    setLocality("All localities");
    setQuery("");
    setMovie("All movies");
  }, [city]);
  const cityVenues = venues.filter((v) => v.cityId === city);
  const list = cityVenues
    .filter(
      (v) =>
        `${v.name} ${v.locality}`.toLowerCase().includes(query.toLowerCase()) &&
        (format === "All formats" || v.formats.includes(format)) &&
        (amenity === "All amenities" || v.amenities.includes(amenity)) &&
        (locality === "All localities" || v.locality === locality) &&
        (distance === "Any distance" || v.distance <= 5) &&
        (movie === "All movies" || v.movieIds.includes(movie)),
    )
    .sort((a, b) =>
      sort === "Nearest"
        ? a.distance - b.distance
        : sort === "A–Z"
          ? a.name.localeCompare(b.name)
          : sort === "Lowest price"
            ? a.price - b.price
            : sort === "Most movies"
              ? b.movieIds.length - a.movieIds.length
              : 0,
    );
  return (
    <main className="discovery-page section-container">
      <div className="page-intro">
        <span className="eyebrow">THE SPACE MAKES THE STORY</span>
        <h1>
          Cinemas in <span>{cities.find((c) => c.id === city)!.name}.</span>
        </h1>
        <p>Find your favourite screen. Or discover a new one.</p>
      </div>
      <div className="cinema-discovery-banner">
        <Building2 size={34} />
        <div>
          <strong>Every cinema has its own character.</strong>
          <span>
            Different screens. Different spaces. One unforgettable experience.
          </span>
        </div>
        <span className="demo-badge">ILLUSTRATIVE DEMO VENUES</span>
      </div>
      <div className="filter-row">
        <SlidersHorizontal size={16} />
        <input
          aria-label="Search cinemas"
          placeholder="Search cinemas or locality…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Cinema format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {["All formats", "IMAX", "2D", "Dolby Atmos"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Amenities"
          value={amenity}
          onChange={(e) => setAmenity(e.target.value)}
        >
          {[
            "All amenities",
            "Parking",
            "Wheelchair access",
            "Recliners",
            "Food court",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Locality"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
        >
          {["All localities", ...cityVenues.map((v) => v.locality)].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Distance"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        >
          <option>Any distance</option>
          <option>Within 5 km</option>
        </select>
        <select
          aria-label="Movie playing"
          value={movie}
          onChange={(e) => setMovie(e.target.value)}
        >
          <option>All movies</option>
          {cityMovies(city).map((m) => (
            <option value={m.id} key={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      <div className="cinema-list-header">
        <span>{list.length} cinemas to explore</span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort cinemas"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {["Popular", "Nearest", "A–Z", "Lowest price", "Most movies"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="cinema-grid">
        {list.map((v) => (
          <CinemaCard key={v.id} venue={v} />
        ))}
      </div>
      {!list.length && <Empty title="No cinemas match your filters" />}
      <p className="demo-note">
        Cinema names, distances, prices, addresses and screenings are
        illustrative demo data. These are not live venue listings.
      </p>
    </main>
  );
}
export function CinemaCard({ venue: v }: { venue: Venue }) {
  return (
    <article className="cinema-card">
      <Link href={`/cinemas/${v.id}`} className="cinema-cover">
        <img
          src={v.image}
          alt={`Illustrative ${v.name} interior`}
          loading="lazy"
        />
        <span>{v.formats[0]}</span>
        <i>
          <ArrowUpRight size={20} />
        </i>
      </Link>
      <div className="cinema-card-copy">
        <span className="eyebrow">
          {v.locality} · {v.distance} KM
        </span>
        <Link href={`/cinemas/${v.id}`}>
          <h2>{v.name}</h2>
        </Link>
        <p>
          <MapPin size={13} />
          {v.address}
        </p>
        <div className="amenity-list">
          {v.amenities.map((a) => {
            const Icon = amenities[a];
            return (
              <span key={a}>
                <Icon size={14} />
                {a}
              </span>
            );
          })}
        </div>
        <div className="cinema-card-bottom">
          <span>
            {v.movieIds.length} films · from <b>{rupees(v.price)}</b>
          </span>
          <Link href={`/cinemas/${v.id}`} className="text-link">
            View shows
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function CinemaDetail({ id }: { id: string }) {
  const v = venues.find((v) => v.id === id);
  const city = useApp((s) => s.city);
  const setCity = useApp((s) => s.setCity);
  if (!v)
    return (
      <main className="section-container">
        <Empty title="This cinema isn’t on our map">
          <Link href="/cinemas" className="text-link">
            Discover cinemas
          </Link>
        </Empty>
      </main>
    );
  if (v.cityId !== city)
    return (
      <main className="section-container">
        <Empty
          title={`This cinema is in ${cities.find((c) => c.id === v.cityId)!.name}`}
        >
          Your current city is {cities.find((c) => c.id === city)!.name}.
          <button className="btn btn-gold" onClick={() => setCity(v.cityId)}>
            Switch to {cities.find((c) => c.id === v.cityId)!.name}
          </button>
          <Link href="/cinemas" className="text-link">
            Browse cinemas in your city
          </Link>
        </Empty>
      </main>
    );
  return (
    <main>
      <section
        className="cinema-detail-hero"
        style={{ backgroundImage: `url(${v.image})` }}
      >
        <div>
          <Link className="back-link" href="/cinemas">
            <ChevronLeft size={15} />
            All cinemas
          </Link>
          <span className="eyebrow">
            {cities.find((c) => c.id === city)!.name} · {v.locality}
          </span>
          <h1>{v.name}</h1>
          <p>
            <MapPin size={16} />
            {v.address}
          </p>
          <div className="chips">
            {v.formats.map((f) => (
              <span className="chip static" key={f}>
                {f}
              </span>
            ))}
          </div>
        </div>
        <span className="demo-badge">ILLUSTRATIVE CINEMA · DEMO LAYOUTS</span>
      </section>
      <section className="venue-details section-container">
        <div className="amenity-list">
          {v.amenities.map((a) => {
            const Icon = amenities[a];
            return (
              <span key={a}>
                <Icon size={18} />
                {a}
              </span>
            );
          })}
        </div>
        <div>
          <span>
            {v.blueprints.length} distinct auditorium
            {v.blueprints.length > 1 ? "s" : ""}
          </span>
          <span>{v.movieIds.length} movies playing</span>
          <span>Tickets from {rupees(v.price)}</span>
        </div>
      </section>
      <Showtimes key={v.id} venue={v} />
    </main>
  );
}
