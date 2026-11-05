"use client";
import "./checkout-background.css";
import "./explore.css";
import "./watchlist.css";
import "./home-atmosphere.css";
import "./movie-detail-polish.css";


import BrowseScrollRestoration from "./BrowseScrollRestoration";
import WatchlistSync from "./WatchlistSync";
import { useEffect, useState, Suspense, lazy } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, X } from "lucide-react";
import Navigation from "./Navigation";
import CinemaBackground from "./CinemaBackground";
import MoviesBackground from "./MoviesBackground";
import AmberCinemaBackground from "./AmberCinemaBackground";
import TicketsBackground from "./TicketsBackground";




import { Logo } from "./ui";
import { api } from "@/lib/client";
import { applyClientCatalog, type Catalog } from "@/lib/catalog-config";
import { useApp } from "@/lib/store";


const Home=lazy(()=>import("./Home"));
const ExplorePage=lazy(()=>import("./ExplorePage"));
const CinemaMoviesPage=lazy(()=>import("./ExplorePage").then(m=>({default:m.CinemaMoviesPage})));
const WatchlistPage=lazy(()=>import("./WatchlistPage"));
const AboutCreator=lazy(()=>import("./Creator"));
const LiveMovieDetail=lazy(()=>import("./LiveMovieDetail"));
const GenrePage=lazy(()=>import("./GenreDiscovery").then(m=>({default:m.GenrePage})));
const CinemaDetail=lazy(()=>import("./Discovery").then(m=>({default:m.CinemaDetail})));
const CinemaDiscovery=lazy(()=>import("./Discovery").then(m=>({default:m.CinemaDiscovery})));
const MovieDetail=lazy(()=>import("./Discovery").then(m=>({default:m.MovieDetail})));
const MovieDiscovery=lazy(()=>import("./Discovery").then(m=>({default:m.MovieDiscovery})));
const Auth=lazy(()=>import("./Account").then(m=>({default:m.Auth})));
const Account=lazy(()=>import("./Account").then(m=>({default:m.Account})));
const MyTickets=lazy(()=>import("./Account").then(m=>({default:m.MyTickets})));
const VerifyTicket=lazy(()=>import("./Account").then(m=>({default:m.VerifyTicket})));
const BookingFlow = lazy(() => import("./BookingFlow"));
const Admin = lazy(() => import("./Admin"));
export default function MovieVerse() {
  const path = usePathname() || "/";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const isWatchlistPage=parts[0]==="watchlist";
  const isCinemaPage = parts[0] === "cinemas";
  const isMovieListingPage = parts[0] === "explore" || parts[0] === "genres" || (parts[0] === "movies" || parts[0] === "coming-soon") && !parts[1];
  const isMovieDetail = parts[0] === "movies" && Boolean(parts[1]);
  const isAmberPage = parts[0] === "account" || parts[0] === "admin";
  const isAuthPage = (parts[0] === "login" || parts[0] === "register") && !parts[1];
  const isTicketPage = parts[0] === "my-tickets" || (parts[0] === "booking" && parts[1] === "confirmation");
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    api<Catalog>("catalog")
      .then((data) => {
        if (!active) return;
        applyClientCatalog(data);
        if (!data.cities.some((c) => c.id === useApp.getState().city))
          useApp.getState().setCity(data.cities[0].id);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setReady(true);
          setToast(
            "Using the bundled demo catalog. Server services may be temporarily unavailable.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  let page;
  if (!ready)
    page = (
      <div className="initial-loading">
        <Logo />
        <span className="spinner" />
      </div>
    );
  else if (!parts.length) page = <Home />;
  else if (parts[0] === "about-the-creator") page = <AboutCreator />;
  else if (parts[0] === "movies")
    page = parts[1]?.startsWith("tmdb-") ? <LiveMovieDetail key={parts[1]} id={parts[1]}/> : parts[1] ? (
      <MovieDetail key={parts[1]} id={parts[1]} />
    ) : (
      <CinemaMoviesPage />
    );
  else if (parts[0] === "explore") page = <ExplorePage/>;
  else if (parts[0] === "genres") page = <GenrePage key={parts[1]} slug={parts[1] || "action"}/>;
  else if (parts[0] === "coming-soon") page = <MovieDiscovery key="coming-soon" upcoming />;
  else if (parts[0] === "cinemas")
    page = parts[1] ? (
      <CinemaDetail key={parts[1]} id={parts[1]} />
    ) : (
      <CinemaDiscovery />
    );
  else if (parts[0] === "booking")
    page =
      parts[1] === "confirmation" ? (
        <MyTickets
          key={parts[2]}
          id={parts[2]}
          confirmation
          notify={setToast}
        />
      ) : (
        <BookingFlow
          key={parts[1]}
          showId={parts[1]}
          step={
            ["seats", "snacks", "checkout"].includes(parts[2])
              ? parts[2]
              : "seats"
          }
          notify={setToast}
        />
      );
  else if (isWatchlistPage) page=<WatchlistPage/>;
  else if (parts[0] === "my-tickets")
    page = <MyTickets id={parts[1]} notify={setToast} />;
  else if (parts[0] === "ticket") page = <VerifyTicket token={parts[1]} />;
  else if (parts[0] === "login" || parts[0] === "register")
    page = (
      <Auth
        register={parts[0] === "register"}
        notify={setToast}
      />
    );
  else if (parts[0] === "account") page = <Account notify={setToast} />;
  else if (parts[0] === "admin") page = <Admin notify={setToast} />;
  else
    page = (
      <main className="empty">
        <h1>Lost in the universe?</h1>
        <Link className="btn btn-gold" href="/">
          Find your way home
          <ArrowUpRight size={16} />
        </Link>
      </main>
    );
  const booking = parts[0] === "booking" && parts[1] !== "confirmation";
  const isCheckoutStep = booking && ["snacks", "checkout"].includes(parts[2]);
  return (
    <div className={isAmberPage ? `amber-route-shell ${parts[0] === "account" ? "profile-route-shell" : ""}` : isAuthPage ? "auth-route-shell" : isCheckoutStep ? "checkout-route-shell" : booking && parts[2] === "seats" ? "seat-route-shell" : isCinemaPage ? "cinema-route-shell" : isMovieListingPage || isWatchlistPage ? "movies-route-shell" : isTicketPage ? "tickets-route-shell" : undefined}>
      {isCinemaPage && <CinemaBackground detail={Boolean(parts[1])} />}
      {(isMovieListingPage || isWatchlistPage) && <MoviesBackground />}
      <WatchlistSync notify={setToast}/>
      <BrowseScrollRestoration/>
      {isTicketPage && <TicketsBackground />}
      {isAmberPage && <AmberCinemaBackground/>}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!isMovieDetail && <Navigation notify={setToast} />}
      <div id="main-content" className="route-frame" key={isAuthPage ? "auth" : path}>
        <Suspense
          fallback={
            <div className="initial-loading">
              <span className="spinner" />
            </div>
          }
        >
          {page}
        </Suspense>
      </div>
      {!booking && !isAuthPage && ready && (
        <footer className="footer section-container">
          <div className="footer-top">
            <div>
              <Logo />
              <p>Your universe. Your movie. Your seat.</p>
            </div>
            <div>
              <Link href="/movies">Movies</Link>
              <Link href="/explore">Explore</Link>
              <Link href="/cinemas">Cinemas</Link>
              <Link href="/coming-soon">Coming soon</Link>
              <Link href="/my-tickets">My tickets</Link>
                <Link href="/watchlist">Watchlist</Link>
              <Link href="/admin">
                Demo studio
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} MovieVerse. Made for the love of
              cinema.
            </span>
            <span>
              Demonstration platform · Sample screenings · Simulated payments
            </span>
          </div>
          <p className="fine-print media-attribution">
            Artwork via{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
            >
              TMDB
            </a>{" "}
            · Not endorsed or certified by TMDB. Materials powered by{" "}
            <a href="https://polyhaven.com/" target="_blank" rel="noreferrer">
              Poly Haven
            </a>
            .
          </p>
        </footer>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
