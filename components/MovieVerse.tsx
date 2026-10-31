"use client";
import { useEffect, useState, Suspense, lazy } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, X } from "lucide-react";
import Navigation from "./Navigation";
import Home from "./Home";
import {
  CinemaDetail,
  CinemaDiscovery,
  MovieDetail,
  MovieDiscovery,
} from "./Discovery";
import { Auth, Account, MyTickets, VerifyTicket } from "./Account";
import { Logo } from "./ui";
import { api } from "@/lib/client";
import { applyClientCatalog, type Catalog } from "@/lib/catalog-config";
import { useApp } from "@/lib/store";
const BookingFlow = lazy(() => import("./BookingFlow"));
const Admin = lazy(() => import("./Admin"));
export default function MovieVerse() {
  const path = usePathname() || "/";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
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
  useEffect(() => {
    if (window.location.hash) {
      const timer = setTimeout(
        () =>
          document
            .getElementById(window.location.hash.slice(1))
            ?.scrollIntoView({ behavior: "smooth" }),
        250,
      );
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [path]);
  let page;
  if (!ready)
    page = (
      <div className="initial-loading">
        <Logo />
        <span className="spinner" />
      </div>
    );
  else if (!parts.length) page = <Home />;
  else if (parts[0] === "movies")
    page = parts[1] ? (
      <MovieDetail key={parts[1]} id={parts[1]} notify={setToast} />
    ) : (
      <MovieDiscovery />
    );
  else if (parts[0] === "coming-soon") page = <MovieDiscovery upcoming />;
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
  else if (parts[0] === "my-tickets")
    page = <MyTickets id={parts[1]} notify={setToast} />;
  else if (parts[0] === "ticket") page = <VerifyTicket token={parts[1]} />;
  else if (parts[0] === "login" || parts[0] === "register")
    page = (
      <Auth
        key={parts[0]}
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
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navigation notify={setToast} />
      <div id="main-content">
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
      {!booking && ready && (
        <footer className="footer section-container">
          <div className="footer-top">
            <div>
              <Logo />
              <p>Your universe. Your movie. Your seat.</p>
            </div>
            <div>
              <Link href="/movies">Movies</Link>
              <Link href="/cinemas">Cinemas</Link>
              <Link href="/coming-soon">Coming soon</Link>
              <Link href="/my-tickets">My tickets</Link>
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
    </>
  );
}
