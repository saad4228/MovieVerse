"use client";
import "./movie-showtimes.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { cities, dates, venues, type Movie, type Show } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { demoShowtimeProvider, type AvailabilitySummary } from "@/lib/providers";
import { rupees } from "@/lib/booking";
import { prepareAuditoriumPlayback } from "@/lib/video/preparation";
import CityCinemaListings from "./CityCinemaListings";
import { Empty } from "./ui";

const all = "All";
const showTime = (time: string) => new Date(`2000-01-01T${time}:00+05:30`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

export default function MovieShowtimes({ movie }: { movie: Movie }) {
  const city = useApp(s => s.city);
  const setCity = useApp(s => s.setCity);
  const setShow = useApp(s => s.setShow);
  const router = useRouter();
  const [date, setDate] = useState(() => dates()[0]);
  const [language, setLanguage] = useState(all);
  const [format, setFormat] = useState(all);
  const [experience, setExperience] = useState(all);
  const [period, setPeriod] = useState(all);
  const [price, setPrice] = useState(all);
  const [stock, setStock] = useState(all);
  const [sort, setSort] = useState("Earliest show");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [inventory, setInventory] = useState<{ key: string; summaries: Record<string, AvailabilitySummary> }>({ key: "", summaries: {} });
  const rows = useMemo(() => venues.filter(v => v.cityId === city && v.movieIds.includes(movie.id)).map(v => ({ v, shows: demoShowtimeProvider.list(v, movie.id, date).sort((a, b) => a.time.localeCompare(b.time)) })), [city, movie.id, date]);
  const screenings = rows.flatMap(r => r.shows);
  const languages = [...new Set(screenings.map(s => s.language))];
  const formats = [...new Set(screenings.map(s => s.format))];
  const experiences = [...new Set(rows.filter(r => r.shows.length).flatMap(r => r.v.amenities))];
  const prices = [...new Set(screenings.map(s => s.price))].sort((a, b) => a - b);
  // Derive compatible values immediately, including the first render after a city change.
  const currentLanguage = languages.includes(language) ? language : all;
  const currentFormat = formats.includes(format) ? format : all;
  const currentExperience = experiences.includes(experience) ? experience : all;
  const currentPrice = price === all || prices.includes(Number(price)) ? price : all;
  if(language!==currentLanguage) setLanguage(currentLanguage);
  if(format!==currentFormat) setFormat(currentFormat);
  if(experience!==currentExperience) setExperience(currentExperience);
  if(price!==currentPrice) setPrice(currentPrice);
  const inventoryKey = screenings.map(s => s.id).join(",");
  const availability = inventory.key === inventoryKey ? inventory.summaries : {};
  useEffect(() => {
    const controller = new AbortController();
    const ids = inventoryKey.split(",").filter(Boolean);
    async function refresh() {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 40) chunks.push(ids.slice(i, i + 40));
      const results = await Promise.all(chunks.map(async chunk => {
        try {
          const response = await fetch(`/api/show-availability?shows=${encodeURIComponent(chunk.join(","))}`, { signal: controller.signal });
          if (!response.ok) return {};
          return (await response.json() as { summaries: Record<string, AvailabilitySummary> }).summaries;
        } catch { return {}; }
      }));
      if (!controller.signal.aborted) setInventory({ key: inventoryKey, summaries: Object.assign({}, ...results) });
    }
    void refresh();
    const timer = setInterval(refresh, 20000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [inventoryKey]);
  const listings = rows.map(({ v, shows }) => ({ v, shows: shows.filter(s =>
    (currentLanguage === all || s.language === currentLanguage) &&
    (currentFormat === all || s.format === currentFormat) &&
    (currentPrice === all || s.price <= Number(currentPrice)) &&
    (period === all || (period === "Before 6 PM" ? s.time < "18:00" : s.time >= "18:00")) &&
    (stock === all || (stock === "Seats available" ? ["available", "limited"].includes(availability[s.id]?.status) : availability[s.id]?.status === "sold-out"))
  ) })).filter(({ v, shows }) => shows.length &&
    `${v.name} ${v.locality} ${v.address}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (currentExperience === all || v.amenities.includes(currentExperience))
  ).sort((a, b) => (sort === "Lowest price" ? Math.min(...a.shows.map(s => s.price)) - Math.min(...b.shows.map(s => s.price)) : sort === "Most shows" ? b.shows.length - a.shows.length : a.shows[0].time.localeCompare(b.shows[0].time)) || Number(b.v.blueprints[0] === "grand") - Number(a.v.blueprints[0] === "grand") || a.v.name.localeCompare(b.v.name));
  const candidates = listings.flatMap(({ v, shows }) => shows.filter(s => ["available", "limited"].includes(availability[s.id]?.status)).map(s => ({ v, s })));
  const earliest = [...candidates].sort((a, b) => a.s.time.localeCompare(b.s.time))[0];
  const cheapest = [...candidates].sort((a, b) => a.s.price - b.s.price || a.s.time.localeCompare(b.s.time))[0];
  const most = [...listings].sort((a, b) => b.shows.length - a.shows.length).find(r => candidates.some(c => c.v.id === r.v.id));
  const mostCandidate = most && candidates.find(c => c.v.id === most.v.id);
  const flagship = candidates.find(c => c.s.blueprintId === "grand");
  const recommendations = [
    earliest && { ...earliest, label: "Earliest checked show", reason: `${earliest.s.format} · First matching show with checked seats` },
    cheapest && { ...cheapest, label: "Lowest checked price", reason: `From ${rupees(cheapest.s.price)} · ${cheapest.s.format} · Demo seats checked` },
    flagship ? { ...flagship, label: "Flagship demo auditorium", reason: "Grand Balcony Cinema · Explore the elevated upper level" } : mostCandidate && { ...mostCandidate, label: "More ways to watch", reason: `${most!.shows.length} matching shows · ${mostCandidate.s.format}` },
  ].filter(x => !!x);
  function choose(show: Show) {
    if (choosing || availability[show.id]?.status === "sold-out") return;
    setChoosing(show.id);
    prepareAuditoriumPlayback(movie);
    setShow(show.id);
    router.push(`/booking/${encodeURIComponent(show.id)}/seats`);
  }
  function resetFilters() { setLanguage(all); setFormat(all); setExperience(all); setPeriod(all); setPrice(all); setStock(all); setQuery(""); }
  const cityName = cities.find(c => c.id === city)?.name || city;
  const filterCount = [currentLanguage, currentFormat, currentExperience, period, currentPrice, stock].filter(v => v !== all).length;
  return <section id="showtimes" className="movie-showtimes" aria-label="Choose a cinema and screening">
    <div className="section-container screening-content">
      <header className="screening-header">
        <div><span className="eyebrow">MAKE IT A MOVIE NIGHT</span>
          <h2 key={`${movie.id}-${city}`}>{movie.title} <em>in {cityName}</em></h2>
          <p className="screening-metadata">{[movie.languages.join(" / "), movie.genre.join(" / "), movie.duration ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : "Runtime TBA", movie.certificate].filter(Boolean).join(" · ")}</p>
        </div>
        <nav className="screening-cities" aria-label="Screening city">{cities.map(c => <button key={c.id} aria-pressed={c.id === city} onClick={() => { if (c.id !== city) setCity(c.id); }}>{c.name}</button>)}</nav>
      </header>
      <div className="screening-date-line"><div className="date-strip" aria-label="Choose screening date">{dates().map((d, i) => {
        const day = new Date(`${d}T12:00:00+05:30`);
        const weekday = day.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
        return <button key={d} className={`date-button ${date === d ? "selected" : ""}`} aria-pressed={date === d} onClick={() => setDate(d)}>
          <span>{i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : weekday}</span><strong>{Number(d.slice(-2))}</strong><small>{day.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}{i < 2 && ` · ${weekday}`}</small>
        </button>;
      })}</div><p className="screening-demo"><span className="demo-badge">DEMO SCREENINGS</span>Illustrative venues · simulated seat inventory<br />All showtimes in IST</p></div>
      <button className="screening-filter-toggle" aria-expanded={filtersOpen} aria-controls="screening-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={16} /> Filters{filterCount ? ` (${filterCount})` : ""}</button>
      <div id="screening-filters" className={`screening-filters ${filtersOpen ? "is-open" : ""}`}>
        <div className="screening-chips" role="group" aria-label="Show language"><span>Language</span>{[all, ...languages].map(l => <button key={l} aria-pressed={currentLanguage === l} onClick={() => setLanguage(l)}>{l === all ? "All languages" : l}</button>)}</div>
        <div className="screening-chips" role="group" aria-label="Show format"><span>Format</span>{[all, ...formats].map(f => <button key={f} aria-pressed={currentFormat === f} onClick={() => setFormat(f)}>{f === all ? "All formats" : f}</button>)}</div>
        <div className="screening-selects">
          <label>Time<select aria-label="Showtime period" value={period} onChange={e => setPeriod(e.target.value)}>{[all, "Before 6 PM", "After 6 PM"].map(v => <option key={v} value={v}>{v === all ? "All times" : v}</option>)}</select></label>
          <label>Price<select aria-label="Maximum ticket price" value={currentPrice} onChange={e => setPrice(e.target.value)}><option value={all}>Any price</option>{prices.map(p => <option key={p} value={p}>From {rupees(p)} or less</option>)}</select></label>
          <label>Availability<select aria-label="Show availability" value={stock} onChange={e => setStock(e.target.value)}><option value={all}>All availability</option><option>Seats available</option><option>Sold out</option></select></label>
          {!!experiences.length && <label>Experience<select aria-label="Cinema experience" value={currentExperience} onChange={e => setExperience(e.target.value)}><option value={all}>All experiences</option>{experiences.map(a => <option key={a}>{a}</option>)}</select></label>}
          {filterCount > 0 && <button className="text-link" onClick={resetFilters}>Reset filters</button>}
        </div>
      </div>
      {!!recommendations.length && <div className="screening-recommendations" aria-label="Compare matching demo screenings">{recommendations.map(r => <a key={r.label} href={`#screening-${r.v.id}`} className="screening-pick"><strong>{showTime(r.s.time)}</strong><div><span>{r.label}</span><b>{r.v.name}</b><small>{r.v.locality} · {r.reason}</small></div><ArrowRight size={18} /></a>)}</div>}
      <div className="screening-toolbar"><label className="screening-search"><span className="sr-only">Filter cinemas</span><input aria-label="Filter cinemas" placeholder="Search cinemas or locality…" value={query} onChange={e => setQuery(e.target.value)} /></label><span>{listings.length} {listings.length === 1 ? "cinema" : "cinemas"}</span><label className="showtime-sort">Sort by<select aria-label="Sort showtime cinemas" value={sort} onChange={e => setSort(e.target.value)}>{["Earliest show", "Most shows", "Lowest price"].map(s => <option key={s}>{s}</option>)}</select></label></div>
      <div className="screening-legend"><span><i className="available" />Available</span><span><i className="limited" />Limited seats</span><span><i className="sold-out" />Sold out</span><span><i className="unknown" />Unverified</span><small>Demo inventory only</small></div>
      <div className="screening-rows" key={`${city}-${movie.id}-${date}`}>
        {listings.map(({ v, shows }) => <article className="screening-row" id={`screening-${v.id}`} key={v.id}>
          <div className="screening-venue"><span className="venue-monogram" aria-hidden="true">{v.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span><div><span className="screening-venue-label">ILLUSTRATIVE VENUE</span><Link href={`/cinemas/${v.id}`}><h3>{v.name}<ArrowUpRight size={14} /></h3></Link><p>{v.locality} · {cityName}</p><p className="screening-address">{v.address}</p><ul aria-label="Venue amenities and screening formats">{[...v.amenities, ...new Set(shows.map(s => s.format))].map(a => <li key={a}>{a}</li>)}</ul></div></div>
          <div className="screening-slots">{shows.map(s => {
            const summary = availability[s.id];
            const status = summary?.status || "unknown";
            return <button key={s.id} className={`time-slot screening-slot ${status} ${choosing === s.id ? "is-selected" : ""}`} disabled={status === "sold-out" || choosing !== null} aria-label={`${s.time} ${movie.title} at ${v.name}`} onClick={() => choose(s)}>
              <strong><i aria-hidden="true" />{showTime(s.time)}</strong><span>{s.format} · {s.language}</span><small>From {rupees(s.price)}</small><small className="screening-stock">{status === "sold-out" ? "Sold out" : status === "unknown" ? "Availability unverified" : summary.available != null ? `${summary.available} demo seats left` : "Demo seats available"}</small>
            </button>;
          })}</div>
        </article>)}
      </div>
      {!listings.length && <Empty title="No screenings for these filters"><p>Try another city, date or filter. No demo screenings are invented for unavailable venues.</p><button className="text-link" onClick={resetFilters}>Clear filters</button></Empty>}
      <CityCinemaListings city={city} movie={movie.id} date={date} />
    </div>
  </section>;
}
