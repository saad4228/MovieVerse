"use client";
import AssetImage from "@/components/AssetImage";
import "./home-atmosphere.css";
import {useBrowseState} from "@/lib/use-browse-state";
import WatchlistButton from "./WatchlistButton";
import {useDiscoveryHome,useCatalogueResource} from "@/lib/discovery-client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "./MovieLink";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Armchair,
  MapPin,
} from "lucide-react";
import { cities, venues, type Movie } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { SectionTitle, Empty } from "./ui";
import PosterWall from "./PosterWall";
import CinematicCarousel, { type CarouselHandle } from "./CinematicCarousel";
import MovieRail from "./MovieRail";
import { discoveryStatus, externalListings } from "@/lib/movie-discovery";
import { posterSet } from "@/lib/movie-media";
import { releaseLabel } from "@/lib/movie-information";
import { useHomepageMotion } from "@/lib/use-homepage-motion";
import { CreatorSection } from "./Creator";
import {MovieCard,Trailer} from "./MovieCards";
import ExploreMovieBanner from "./ExploreMovieBanner";
export {MovieCard,Trailer} from "./MovieCards";
export default function Home() {
  const cityId = useApp((s) => s.city);
  const city = cities.find((c) => c.id === cityId)!;
  const [{active,language},setBrowse,browseLoaded]=useBrowseState(`movieverse-home-browse:${cityId}`,{active:3,language:"All"});
  const setActive=(active:number)=>setBrowse(state=>({...state,active}));
  const setLanguage=(language:string)=>setBrowse(state=>({...state,language}));
  const [trailer, setTrailer] = useState<Movie | null>(null);
  const carousel = useRef<CarouselHandle>(null);
  const pageRef = useRef<HTMLElement>(null);
  const {data:discovery}=useDiscoveryHome();
  const {data:bookable,error:bookingError,retry:retryBookings}=useCatalogueResource<{featured:Movie[]}>(`/api/bookable-featured?city=${encodeURIComponent(cityId)}`);
  useHomepageMotion(pageRef, `${cityId}-${language}-${discovery?.lastSync}-${bookable?.featured.length}`);
  const panorama = bookable?.featured ?? [];
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
    )[featured?.id??""] || featured?.accent || "#f9be3c";
  const rotate = (direction: number) => carousel.current?.step(direction);
  const nowPlaying=discovery?.collections["now-playing-IN"]??[];
  const showing = nowPlaying.filter(m=>language==="All"||m.languages.includes(language));
  const upcoming=[...new Map([...(discovery?.collections.upcoming??[]),...(discovery?.collections["upcoming-global"]??[])].map(m=>[m.id,m])).values()];
  const sections={advance:[] as Movie[],released:discovery?.collections.popular??[],coming:upcoming.slice(0,6),trending:discovery?.collections["trending-day"]??[],regional:discovery?.regional??[]};
  const advance = sections.advance;
  const coming = sections.coming;
  return (
    <main ref={pageRef} className="movieverse-home">
      {featured ? <section
        className="cinema-lobby moonlit-lobby"
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
        <AssetImage className="lobby-backdrop" src="/assets/moonlit-theater.png" alt="" aria-hidden="true" fetchPriority="high" decoding="async" />
        <div className="lobby-atmosphere" aria-hidden="true" />
        <div className="lobby-heading">
          <span className="lobby-kicker">WELCOME TO YOUR NEXT ESCAPE</span>
          <h1 aria-label="MOVIEVERSE">
            <AssetImage className="hero-official-logo" src="/assets/movieverse-logo.png" alt="MovieVerse" width={649} height={117}/>
          </h1>
          <p>
            DRAG TO EXPLORE <span>·</span> TAP A SCREEN TO BOOK
          </p>
        </div>
        {browseLoaded && <CinematicCarousel initial={active}
          key={cityId}
          ref={carousel}
          movies={panorama}
          onChange={setActive}
        />}
        <div className="cinema-floor" aria-hidden="true" />
        <div className="lobby-controls">
          <button
            className="round-button"
            aria-label="Previous movie"
            onClick={() => rotate(-1)}
          >
            <ChevronLeft size={21} />
          </button>
          <div className="featured-movie">
            <div className={`featured-info${featured.title.length > 30 ? " long-title" : ""}`} key={featured.id} aria-live="polite">
              <span className="booking-status">
                <i />
                {({"coming-soon":"COMING TO YOUR UNIVERSE","now-showing":"NOW SHOWING · BOOKING OPEN","advance-booking":"ADVANCE BOOKING OPEN","released":"RELEASED · EXPLORE THE FILM","unconfirmed":"DISCOVER THE FILM"})[discoveryStatus(featured,cityId,venues)]}
              </span>
              <h2>{featured.title}</h2>
              <p>
                <span className="certificate">{featured.certificate}</span>
                {featured.languages[0]} · {featured.genre.join(", ")} ·{" "}
                {featured.duration ? `${Math.floor(featured.duration / 60)}h ${featured.duration % 60}m` : "Runtime to be confirmed"}{" "}
                <span className="gold">{featured.rating ? `★ ${featured.rating}` : "Not rated"}</span>
              </p>
            </div>
            <div className="featured-actions">
              <WatchlistButton movie={featured} variant="icon"/>
              <button
                className="btn btn-outline"
                onClick={() => setTrailer(featured)}
              >
                <Play size={12} fill="currentColor" />
                Trailer
              </button>
              <Link className="btn btn-gold" href={`/movies/${featured.id}`}>
                {["now-showing","advance-booking"].includes(discoveryStatus(featured,cityId,venues)) ? "Book tickets" : "Explore"}
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
      </section> : <section className="cinema-lobby moonlit-lobby"><AssetImage className="lobby-backdrop" src="/assets/moonlit-theater.png" alt=""/><div className="section-container empty"><h1>Your universe of cinema.</h1><p role="status">{bookingError || (bookable ? "No bookable screenings in this city right now. Explore the worldwide catalogue." : "Finding bookable screenings...")}</p><button className="btn btn-outline" onClick={retryBookings}>Refresh screenings</button><Link className="text-link" href="/explore">Explore movies</Link></div></section>}
      <section className="home-showing" id="now-showing">
        <div className="section-container" data-home-reveal>
          <SectionTitle
            eyebrow="DEMO SCREENINGS · SIMULATED BOOKINGS"
            title="Now playing in India"
            subtitle="TMDB movie discovery for India, not live cinema schedules. Available demo screenings and seat bookings are simulations."
            link="/explore?collection=now-playing-IN"
            label={`See all (${nowPlaying.length})`}
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
        <MovieRail key={`${cityId}-${language}`} label={`Now showing in ${city.name}`} curved>
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
        </MovieRail>
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
      <section className={`section-container discovery-section advance-section${advance.length ? "" : " is-empty"}`}>
        <SectionTitle eyebrow="SAVED PARTNER REFERENCES" title="Partner listings to explore" subtitle={`Saved listings for ${city.name}; check the partner for current screenings and availability.`} link="/coming-soon" label="Explore all" />
        {advance.length ? <MovieRail label={`Advance booking in ${city.name}`}>
          {advance.map((m,i)=><div key={m.id} className="discovery-rail-card"><MovieCard movie={m} index={i}/><span className="external-listing-note">Partner booking · {externalListings(m.id,cityId)[0]?.venueNames?.slice(0,2).join(" · ") || city.name}</span></div>)}
        </MovieRail> : <p className="discovery-empty">No verified advance bookings are listed for {city.name} today.</p>}
      </section>
      <PosterWall movies={discovery?.collections.popular??[]} />
      <section className="section-container discovery-section">
        <SectionTitle title="More stories to discover" subtitle="Released films without verified local showtimes. Explore their stories and cast." link="/explore?collection=all" label="Browse all films"/>
        {sections.released.length ? <MovieRail label="Released films">{sections.released.map((m,i)=><MovieCard key={m.id} movie={m} index={i}/>)}</MovieRail> : <p className="discovery-empty">No released discovery films are available yet. Browse the full catalogue to explore more stories.</p>}
      </section>
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
          <AssetImage
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
          {coming
            .map((m) => (
              <Link
                key={m.id}
                href={`/movies/${m.id}`}
                className="upcoming-card"
              >
                <AssetImage
                  src={m.poster}
                  srcSet={posterSet(m)}
                  sizes="(max-width:760px) 220px, 420px"
                  alt={`${m.title} poster`}
                  loading="lazy"
                />
                <div>
                  <span className="eyebrow">
                    {m.metadata?.releaseDates.some(r=>r.region==="IN"&&r.date)?releaseLabel(m):m.release ? `Global release: ${m.release}` : "Release to be confirmed"}
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
      <section className="section-container discovery-section">
        <SectionTitle eyebrow="TRENDING WORLDWIDE" title="The stories everyone is discovering" subtitle="Fresh TMDB trends. Popularity does not confirm local screenings." link="/explore?collection=trending-day" label="Explore all" />
        {sections.trending.length ? <>
          <MovieRail label={"Trending movies"}>
            {sections.trending.slice(0, 8).map((m,i)=><MovieCard key={m.id} movie={m} index={i}/>)}
          </MovieRail>
        </> : <p className="discovery-empty">Trending stories are waiting for the next refresh.</p>}
      </section>
      <section className="section-container discovery-section">
        <SectionTitle eyebrow="FRESH FROM EVERY CORNER" title={`Popular regional picks in ${city.name}`} subtitle="Fresh Indian-language discoveries. Local screenings are separate from movie popularity." link="/explore?collection=indian" label="Browse movies" />
        {sections.regional.length ? <MovieRail label={`Regional movies in ${city.name}`}>
          {sections.regional.slice(0, 12).map((m,i)=><MovieCard key={m.id} movie={m} index={i}/>)}
        </MovieRail> : <p className="discovery-empty">Regional discoveries are waiting for the next catalogue refresh.</p>}
      </section>
      <ExploreMovieBanner collections={discovery?.collections}/>
      <CreatorSection />
      {trailer && <Trailer movie={trailer} onClose={() => setTrailer(null)} />}
    </main>
  );
}
