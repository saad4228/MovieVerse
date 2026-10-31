"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  ChevronDown,
  Ticket,
  User,
  ArrowUpRight,
  Building2,
  Landmark,
  Film,
  LocateFixed,
  Menu,
  X,
} from "lucide-react";
import { cities, cityMovies, venues } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { api } from "@/lib/client";
import { Logo, Modal, Empty } from "./ui";
export default function Navigation({
  notify,
}: {
  notify: (s: string) => void;
}) {
  const [modal, setModal] = useState<"city" | "search" | null>(null);
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [focus, setFocus] = useState(0);
  const cityId = useApp((s) => s.city),
    setCity = useApp((s) => s.setCity),
    recent = useApp((s) => s.recentCities);
  const city = cities.find((c) => c.id === cityId)!;
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    const update = () => {
      api("session")
        .then((x) => setUser(x.user))
        .catch(() => {});
    };
    update();
    window.addEventListener("mv-auth", update);
    return () => window.removeEventListener("mv-auth", update);
  }, []);
  const previousPath = useRef(path);
  useEffect(() => {
    if (previousPath.current !== path) {
      setModal(null);
      setMobile(false);
      previousPath.current = path;
    }
  }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal("search");
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function open(which: "city" | "search") {
    setQuery("");
    setFocus(0);
    setModal(which);
  }
  function choose(id: string) {
    if (id !== cityId) {
      api("release", {}).catch(() => {});
      setCity(id);
      notify(`You’re exploring ${cities.find((c) => c.id === id)!.name} now.`);
      if (path.startsWith("/booking")) router.push("/movies");
    }
    setModal(null);
  }
  const q = query.toLowerCase();
  const results = [
    ...cityMovies(cityId)
      .filter((m) =>
        `${m.title} ${m.languages.join(" ")} ${m.genre.join(" ")}`
          .toLowerCase()
          .includes(q),
      )
      .map((m) => ({
        type: "Movie",
        title: m.title,
        detail: m.genre.join(" · "),
        href: `/movies/${m.id}`,
        image: m.poster,
      })),
    ...venues
      .filter(
        (v) =>
          v.cityId === cityId &&
          `${v.name} ${v.locality}`.toLowerCase().includes(q),
      )
      .map((v) => ({
        type: "Cinema",
        title: v.name,
        detail: v.locality,
        href: `/cinemas/${v.id}`,
        image: v.image,
      })),
    ...cities
      .filter((c) => query && c.name.toLowerCase().includes(q))
      .map((c) => ({
        type: "City",
        title: c.name,
        detail: c.subtitle,
        href: c.id,
        image: "",
      })),
  ].slice(0, 10);
  const navigate = (r: (typeof results)[number]) => {
    if (r.type === "City") choose(r.href);
    else router.push(r.href);
    setModal(null);
  };
  return (
    <>
      <header
        className={`header ${path === "/" || path.startsWith("/movies/") ? "overlay" : ""}`}
      >
        <div className="nav-wrap">
          <Logo />
          <nav
            className={mobile ? "nav-links mobile-open" : "nav-links"}
            aria-label="Main navigation"
          >
            <Link className={path === "/movies" ? "active" : ""} href="/movies">
              Movies
            </Link>
            <Link
              className={path.startsWith("/cinemas") ? "active" : ""}
              href="/cinemas"
            >
              Cinemas
            </Link>
            <Link
              className={path === "/coming-soon" ? "active" : ""}
              href="/coming-soon"
            >
              Coming soon
            </Link>
          </nav>
          <div className="nav-actions">
            <button
              className="search-trigger"
              onClick={() => open("search")}
              aria-label="Search movies and cinemas"
            >
              <Search size={16} />
              <span>Search movies, cinemas…</span>
              <kbd>⌘ K</kbd>
            </button>
            <Link className="nav-button tickets-button" href="/my-tickets">
              <Ticket size={16} />
              <span>My tickets</span>
            </Link>
            <button
              className="nav-button city-button"
              onClick={() => open("city")}
            >
              <MapPin size={16} />
              <span>{city.name}</span>
              <ChevronDown size={13} />
            </button>
            <Link
              className="btn btn-gold sign-in"
              href={user ? "/account" : "/login"}
            >
              <User className="mobile-only" size={20} />
              <span>{user ? user.name.split(" ")[0] : "Sign in"}</span>
            </Link>
            <button
              className="icon-btn menu-toggle"
              onClick={() => setMobile(!mobile)}
              aria-label="Toggle navigation"
            >
              {mobile ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      {modal === "city" && (
        <Modal title="Choose your city" onClose={() => setModal(null)} wide>
          <span className="eyebrow">EVERY CITY HAS A STORY</span>
          <h2>Where’s your next movie?</h2>
          <p className="muted">Find the big screen, a little closer to you.</p>
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search for your city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="detect-location"
            onClick={() => {
              if (!navigator.geolocation) {
                notify("Location is unavailable. Please choose a city.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const points:
                    | [[string, number, number]]
                    | [string, number, number][] = [
                    ["chennai", 13.08, 80.27],
                    ["mumbai", 19.07, 72.87],
                    ["nagpur", 21.14, 79.08],
                    ["pune", 18.52, 73.85],
                    ["delhi", 28.61, 77.2],
                    ["bengaluru", 12.97, 77.59],
                    ["hyderabad", 17.38, 78.48],
                    ["kolkata", 22.57, 88.36],
                    ["ahmedabad", 23.02, 72.57],
                    ["jaipur", 26.91, 75.78],
                  ];
                  points.sort(
                    (a, b) =>
                      (a[1] - pos.coords.latitude) ** 2 +
                      (a[2] - pos.coords.longitude) ** 2 -
                      ((b[1] - pos.coords.latitude) ** 2 +
                        (b[2] - pos.coords.longitude) ** 2),
                  );
                  choose(points[0][0]);
                },
                () =>
                  notify(
                    "Location permission was not granted. You can select your city below.",
                  ),
              );
            }}
          >
            <LocateFixed size={16} /> Use my current location
          </button>
          {!query && recent.length > 0 && (
            <div className="recent-cities">
              <span className="eyebrow">RECENTLY EXPLORED</span>
              {recent.map((id) => (
                <button className="chip" key={id} onClick={() => choose(id)}>
                  {cities.find((c) => c.id === id)!.name}
                </button>
              ))}
            </div>
          )}
          <h3 className="small-label">
            {query ? "SEARCH RESULTS" : "CHOOSE YOUR CITY"}
          </h3>
          <div className="city-grid">
            {cities
              .filter((c) => c.name.toLowerCase().includes(q))
              .map((c, i) => (
                <button
                  className={`city-tile ${c.id === cityId ? "selected" : ""}`}
                  key={c.id}
                  onClick={() => choose(c.id)}
                >
                  {i % 2 ? <Landmark size={33} /> : <Building2 size={33} />}
                  <strong>{c.name}</strong>
                  {c.id === cityId && <span>Selected</span>}
                </button>
              ))}
          </div>
          {!cities.some((c) => c.name.toLowerCase().includes(q)) && (
            <Empty title="That city isn’t on our map yet">
              Try one of our 10 demo cities.
            </Empty>
          )}
          <p className="fine-print">
            Demonstration cinemas and showtimes. Your city preference is saved
            on this device.
          </p>
        </Modal>
      )}
      {modal === "search" && (
        <Modal title="Search MovieVerse" onClose={() => setModal(null)} wide>
          <span className="eyebrow">FIND YOUR NEXT GREAT STORY</span>
          <div className="search-field big">
            <Search size={22} />
            <input
              aria-label="Search movies, cinemas and cities"
              autoFocus
              placeholder="Movies, cinemas, cities…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocus(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocus((f) => Math.min(f + 1, results.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFocus((f) => Math.max(0, f - 1));
                }
                if (e.key === "Enter" && results[focus])
                  navigate(results[focus]);
              }}
            />
            {query && (
              <button
                className="icon-btn"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="small-label">
            {query ? "SEARCH RESULTS" : `EXPLORE IN ${city.name.toUpperCase()}`}
          </p>
          <div className="search-results">
            {results.map((r, i) => (
              <button
                key={r.href}
                className={`search-result ${focus === i ? "focused" : ""}`}
                onClick={() => navigate(r)}
              >
                {r.image ? <img src={r.image} alt="" /> : <MapPin />}
                <span>
                  <small>{r.type}</small>
                  <strong>{r.title}</strong>
                  <span>{r.detail}</span>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          {results.length === 0 && (
            <Empty title="No stories found">
              Try a movie title, cinema name, language, or city.
            </Empty>
          )}
        </Modal>
      )}
    </>
  );
}
