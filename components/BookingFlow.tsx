"use client";
import CheckoutExperience from "./CheckoutExperience";
import { checkoutOffer } from "@/lib/checkout-offers";
import type { TrailerController, TrailerState } from "@/lib/video/controller";
import "./seat-workspace.css";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "./MovieLink";
import {
  SlidersHorizontal,
  RotateCcw,
  LocateFixed,
  Undo2,
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  Sparkles,
  Camera,
  Armchair,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Lightbulb,
  Grid2X2,
  Box,
  Trash2,
  Clock,
  ShieldCheck,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  blueprints,
  categories, seatClassesFor,
  getShow,
  makeSeats,
  movies,
  snacks,
  venues,
  type Blueprint,
  type Movie,
  type Seat,
  type Show,
} from "@/lib/catalog";
import {
  calculatePrice,
  recommendSeats,
  rupees,
  seatPrice,
  type Inventory,
} from "@/lib/booking";
import { useApp } from "@/lib/store";
import { api } from "@/lib/client";
import { bookingProvider, seatInventoryProvider } from "@/lib/providers";
import type { Preset } from "./SeatScene";
import { seatFinishes } from "@/lib/seat-presentation";
import { viewpoints, tourViews, screenViewMetrics } from "@/lib/auditorium";
import { directSources, embeddedTrailer, officialTrailerLink } from "@/lib/video/sources";
const Scene = lazy(() => import("./SeatScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MovieVerse auditorium failed", error, info.componentStack);
    this.props.onError();
  }
  render() {
    return this.state.error ? (
      <div className="scene-loading">
        The 3D view could not load. Use the accessible 2D seat map.
      </div>
    ) : (
      this.props.children
    );
  }
}
type InventoryResponse = {
  show: Show;
  blueprint: Blueprint;
  seats: Seat[];
  inventory: Inventory;
};
export default function BookingFlow({
  showId,
  step,
  notify,
}: {
  showId: string;
  step: string;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const show = getShow(showId);
  const movie = movies.find((m) => m.id === show?.movieId);
  const venue = venues.find((v) => v.id === show?.venueId);
  const city = useApp((s) => s.city);
  const setShow = useApp((s) => s.setShow);
  const ids = useApp((s) => s.seats),
    setSeats = useApp((s) => s.setSeats);
  const expiry = useApp((s) => s.holdExpires);
  const setExpiry = useApp((s) => s.setExpiry);
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [preferredCategory, setPreferredCategory] = useState("all");
  const [selectionHistory, setSelectionHistory] = useState<string[][]>([]);
  const changeSeats = useCallback((next: string[]) => {
    if (busy) return;
    const previous = [...useApp.getState().seats];
    setSelectionHistory(history => [...history.slice(-19), previous]);
    setSeats(next);
  }, [busy,setSeats]);
  function undoSelection() {
    const previous = selectionHistory.at(-1);
    if (!previous || !data || busy) return;
    const allowed = previous.filter(id => {
      const seat = data.seats.find(s => s.id === id), state = data.inventory[id];
      return seat && !seat.blocked && (state?.status === "available" || state?.status === "held" && state.mine);
    });
    setSeats(allowed.filter(id => {
      const seat = data.seats.find(s => s.id === id)!;
      return !seat.pair || data.seats.filter(s => s.pair === seat.pair).every(s => allowed.includes(s.id));
    }));
    setSelectionHistory(history => history.slice(0,-1));
  }
  useEffect(() => {
    setShow(showId);
  }, [showId, setShow]);
  useEffect(() => {
    let active = true;
    setData(null); setError(""); setSelectionHistory([]); setPreferredCategory("all");
    const refresh = () =>
      seatInventoryProvider.get(showId)
        .then((x) => {
          if (active) {
            setData(x);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showId]);
  useEffect(() => {
    if (!expiry || expiry <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiry]);
  if (!show || !movie || !venue)
    return (
      <main className="empty">
        <h1>This show has left the screen.</h1>
        <p>Choose a current screening to continue.</p>
        <Link className="btn btn-gold" href="/movies">
          Find a show
        </Link>
      </main>
    );
  if (venue.cityId !== city)
    return (
      <main className="empty">
        <h1>Let’s find a show in your city.</h1>
        <p>This screening belongs to a different city.</p>
        <Link className="btn btn-gold" href={`/movies/${movie.id}`}>
          Explore showtimes
        </Link>
      </main>
    );
  const b =
    data?.blueprint || blueprints.find((b) => b.id === show.blueprintId)!;
  const allSeats = data?.seats || makeSeats(b);
  const selected = allSeats.filter((s) => ids.includes(s.id));
  const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
  const timer = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  async function reserve() {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      const result = await bookingProvider.hold(showId, ids);
      setExpiry(result.expires);
      router.push(`/booking/${encodeURIComponent(showId)}/snacks`);
    } catch (e) {
      notify((e as Error).message);
      const refreshed = await api<InventoryResponse>(
        `inventory?show=${encodeURIComponent(showId)}`,
      ).catch(() => null);
      if (refreshed) setData(refreshed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`booking-page ${step === "seats" ? "seat-page" : ""}`}>
      <div className="booking-topbar">
        <Link
          className="round-button small"
          href={
            step === "seats"
              ? `/movies/${movie.id}#showtimes`
              : `/booking/${encodeURIComponent(showId)}/${step === "checkout" ? "snacks" : "seats"}`
          }
          aria-label="Back"
        >
          <ArrowLeft size={17} />
        </Link>
        <div>
          <h1>{movie.title}</h1>
          <p>
            {venue.name} · {show.date} · {show.time} · {show.format} ·{" "}
            {show.language}
          </p>
        </div>
        <span className="certificate">{movie.certificate}</span>
        {step !== "seats" && (
          <span className={`hold-timer ${remaining < 60 ? "urgent" : ""}`}>
            <Clock size={15} />
            {remaining ? `Seats held for ${timer}` : "Seat hold expired"}
          </span>
        )}
      </div>
      {step === "seats" ? (
        <div className="seat-layout">
          <section className="auditorium-viewport">
            {error ? (
              <div className="scene-loading">
                <AlertCircle />
                <h2>Unable to load seating</h2>
                <p>{error}</p>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setError("");
                    api<InventoryResponse>(
                      `inventory?show=${encodeURIComponent(showId)}`,
                    )
                      .then(setData)
                      .catch((e) => setError(e.message));
                  }}
                >
                  Try again
                </button>
              </div>
            ) : !data ? (
              <div className="scene-loading">
                <span className="spinner" />
                <h2>Preparing your cinema</h2>
                <p>Finding the best view in the house…</p>
              </div>
            ) : (
              <SeatExperience
                key={data.show.id}
                data={data}
                movie={movie}
                selected={ids}
                onSelect={changeSeats}
                notify={notify}
              />
            )}
          </section>
          <aside className={`booking-sidebar ${summaryOpen ? "summary-open" : ""}`} aria-label="Seat selection and checkout">
            <button className="booking-summary-toggle" aria-expanded={summaryOpen} aria-controls="seat-summary-panel" onClick={() => setSummaryOpen(open => !open)}>{summaryOpen ? "Return to theatre" : `Seat options & summary (${selected.length})`}</button>
            <div className="sidebar-content" id="seat-summary-panel">
              <span className="small-label">SEAT CLASSES</span>
              <div className="seat-categories">
                {[...seatClassesFor(b)]
                  .reverse()
                  .filter((c) => allSeats.some((s) => s.category === c.id))
                  .map((c) => (
                    <button type="button" className="seat-class" key={c.id} title={c.description} aria-pressed={preferredCategory === c.id} onClick={() => setPreferredCategory(value => value === c.id ? "all" : c.id)}>
                      <i style={{ background: b.seatClasses?.find(custom=>custom.id===c.id)?.color || seatFinishes[c.id]?.label || c.color }} />
                      <span>
                        <strong>{c.name}</strong>
                        <small className="seat-class-description">{c.description}</small>
                      </span>
                      <span>
                        <strong>{rupees(c.price + show.price - 160)}</strong>
                        <small className="available-text">
                          {data
                            ? allSeats.filter(
                                (s) =>
                                  s.category === c.id &&
                                  data.inventory[s.id]?.status === "available",
                              ).length
                            : "—"}{" "}
                          left
                        </small>
                      </span>
                    </button>
                  ))}
              </div>
              <div className="seat-legend">
                <span>
                  <i className="booked" />
                  Booked
                </span>
                <span>
                  <i className="picked" />
                  Your pick
                </span>
                <span>
                  <i className="available" />
                  Available
                </span>
                <span><i className="accessible" />Accessible</span>
              </div>
              <BestSeats
                data={data}
                selected={ids}
                onPick={changeSeats}
                notify={notify}
                category={preferredCategory}
                setCategory={setPreferredCategory}
              />
              <div className="your-seats">
                {selectionHistory.length > 0 && <button className="selection-undo" disabled={busy} onClick={undoSelection}><Undo2 size={13} />Undo selection</button>}
                <span className="small-label">
                  YOUR SEATS{" "}
                  <span>{selected.length ? `(${selected.length})` : ""}</span>
                </span>
                <SelectionRows seats={selected} show={show} onRemove={seat => {
                  changeSeats(selected.filter(x => x.id !== seat.id && (!seat.pair || x.pair !== seat.pair)).map(s => s.id));
                }} />
              </div>
              <div className="layout-note" title="Illustrative demo layout. Not a measured real-world auditorium. Accessible seats are marked in the 2D map.">
                <Info size={14} />
                <p>
                  {b.name}
                  <br />
                  {allSeats.length} seats · Illustrative demo layout.

                </p>
              </div>
            </div>
            <div className="sidebar-checkout">
              <div>
                <span>
                  {selected.length} ticket{selected.length !== 1 ? "s" : ""}
                  <small>
                    + fees{" "}
                    {rupees(
                      selected.length * 28 +
                        Math.round(selected.length * 28 * 0.18),
                    )}
                  </small>
                </span>
                <strong className="price-update" key={calculatePrice(selected, show, {}).total} aria-live="polite">
                  {rupees(calculatePrice(selected, show, {}).total)}
                </strong>
              </div>
              <button
                className="btn btn-gold"
                aria-busy={busy}
                disabled={!selected.length || busy || !data}
                onClick={reserve}
              >
                {busy ? "Reserving your seats…" : "Continue · Add snacks"}
                <ArrowRight size={17} />
              </button>
              <small>Seats are reserved when you continue.</small>
            </div>
          </aside>
        </div>
      ) : (
        <div className="booking-steps-page section-container">
          <div className="booking-progress" aria-label="Booking progress" data-step={step}>
            <Link href={`/booking/${encodeURIComponent(showId)}/seats`}>
              <Check size={14} />
              Your seats
            </Link>
            <i />
            <span className={step === "snacks" ? "current" : ""}>
              {step === "checkout" ? <Check size={14} /> : <span>2</span>}Snacks
            </span>
            <i />
            <span className={step === "checkout" ? "current" : ""}>
              <span>3</span>Checkout
            </span>
          </div>
          {!remaining && (
            <div className="hold-expired">
              <AlertCircle size={19} />
              <span>
                Your seat hold has expired. Please select your seats again.
              </span>
              <Link
                className="text-link"
                href={`/booking/${encodeURIComponent(showId)}/seats`}
              >
                Return to seats
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
          {step === "snacks" ? (
            <SnacksStep
              show={show}
              movie={movie}
              selected={selected}
              active={remaining > 0}
            />
          ) : (
            <CheckoutStep
              show={show}
              movie={movie}
              selected={selected}
              active={remaining > 0}
              notify={notify}
            />
          )}
        </div>
      )}
    </main>
  );
}
function SelectionRows({ seats, show, onRemove }: { seats: Seat[]; show: Show; onRemove: (s: Seat) => void }) {
  const [rows,setRows] = useState<Seat[]>(seats);
  const signature = seats.map(s => s.id).join(",");
  useEffect(() => {
    setRows(previous => [...seats, ...previous.filter(s => !seats.some(next => next.id === s.id))]);
    const timer = setTimeout(() => setRows(seats), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
    return () => clearTimeout(timer);
  }, [signature]);
  if (!rows.length) return <p className="no-seats">Click any seat in the hall, or let us pick the best ones.</p>;
  return <div className="selected-seats-list" aria-label="Selected seats">
    {rows.map(s => {
      const leaving = !seats.some(current => current.id === s.id);
      return <div key={s.id} className={leaving ? "seat-row-leaving" : ""} aria-hidden={leaving || undefined}>
        <span className="selected-seat-icon"><Armchair size={17}/></span>
        <span><strong>{s.id}</strong><small>{s.classDefinition?.name ?? categories.find(c=>c.id===s.category)?.name ?? s.category}</small></span>
        <strong>{rupees(seatPrice(s,show))}</strong>
        <button className="icon-btn" aria-label={`Remove ${s.id}`} disabled={leaving} onClick={()=>onRemove(s)}><Trash2 size={14}/></button>
      </div>;
    })}
  </div>;
}
function BestSeats({
  data,
  selected,
  onPick,
  notify,
  category,
  setCategory,
}: {
  data: InventoryResponse | null;
  selected: string[];
  onPick: (ids: string[]) => void;
  notify: (s: string) => void;
  category: string;
  setCategory: (category: string) => void;
}) {
  const [count, setCount] = useState(2);
  return (
    <div className="quick-pick">
      <span className="small-label">QUICK PICK</span>
      <select
        aria-label="Preferred seat class"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="all">Any seat class</option>
        {(data ? seatClassesFor(data.blueprint) : categories)
          .filter((c) => data?.seats.some((s) => s.category === c.id))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <div>
        <div className="quantity-control">
          <button
            aria-label="Fewer seats"
            disabled={count === 1}
            onClick={() => setCount(Math.max(1, count - 1))}
          >
            <Minus size={13} />
          </button>
          <strong>{count}</strong>
          <button
            aria-label="More seats"
            disabled={count === 8}
            onClick={() => setCount(Math.min(8, count + 1))}
          >
            <Plus size={13} />
          </button>
        </div>
        <button
          className="btn btn-white"
          disabled={!data}
          onClick={() => {
            if (!data) return;
            const inventory = { ...data.inventory };
            selected.forEach((id) => {
              if (inventory[id]?.mine) inventory[id] = { status: "available" };
            });
            const best = recommendSeats(
              data.seats,
              inventory,
              count,
              data.blueprint,
              category,
            );
            if (best.length) {
              onPick(best.map((s) => s.id));
              notify(
                `${best.map((s) => s.id).join(", ")} — adjacent seats near the centre, around two-thirds back. A balanced view of the screen.`,
              );
            } else
              notify(
                "No adjacent group matches that choice. Try fewer seats or another class.",
              );
          }}
        >
          <Sparkles size={14} />
          Best {count} seat{count > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
function SeatExperience({
  data,
  movie,
  selected,
  onSelect,
  notify,
}: {
  data: InventoryResponse;
  movie: Movie;
  selected: string[];
  onSelect: (ids: string[]) => void;
  notify: (s: string) => void;
}) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [mapLevel, setMapLevel] = useState(0);
  const [preset, setPreset] = useState<Preset>("Overview");
  const [viewIndex, setViewIndex] = useState(0);
  const [cameraCommand, setCameraCommand] = useState(0);
  const [lights, setLights] = useState(true);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [hd, setHd] = useState(true);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [hover, setHover] = useState<Seat | null>(null);
  const [media, setMedia] = useState("Loading screen…");
  const playMedia = useRef<TrailerController | null>(null);
  const [playbackState, setPlaybackState] = useState<TrailerState>("idle");
  const playbackReady = useCallback((controller: TrailerController | null) => {
    playMedia.current = controller;
  }, []);
  const playbackBlocked = playbackState === "blocked";
  const viewport = useRef<HTMLDivElement>(null);
  const { blueprint: b, seats, inventory } = data;
  const views = viewpoints(b);
  const tourStops = tourViews(b);
  const previewSeat = seats.find(s => s.id === preview);
  const viewMetrics = previewSeat && !b.modelUrl ? screenViewMetrics(b,previewSeat) : null;
  const previewSeats = selected.filter(id => {
    const seat = seats.find(s => s.id === id), status = inventory[id];
    return seat && !seat.blocked && status?.status !== "booked" && status?.status !== "blocked" && !(status?.status === "held" && !status.mine);
  });
  const previewOriginMode = useRef<"2d" | "3d">("3d");
  function exitPreview() {
    setPreset("Free view");
    setCameraCommand(c => c + 1);
    setMode(previewOriginMode.current);
  }
  function nextPreview(direction: number) {
    const index = previewSeats.indexOf(preview || "");
    setPreview(previewSeats[(index + direction + previewSeats.length) % previewSeats.length]);
    setCameraCommand(c => c + 1);
  }
  useEffect(() => {
    if (preset !== "My seat" || previewSeats.includes(preview || "")) return;
    if (previewSeats.length) setPreview(previewSeats[0]);
    else exitPreview();
  }, [preset, preview, previewSeats.join(",")]);
  const officialLink = officialTrailerLink(movie);
  const trailerUnavailable = media.includes("could not") || media.includes("did not") || media.includes("unavailable");
  const canPlay = !trailerUnavailable && (directSources(movie).length > 0 || !!embeddedTrailer(movie));
  const freeView = useCallback(() => setPreset("Free view"), []);
  const navigateView = (direction: number) => {
    setViewIndex((i) => (i + direction + views.length) % views.length);
    setPreset("Viewpoint");
    setCameraCommand((c) => c + 1);
    setMode("3d");
  };
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!c.getContext("webgl2")) setMode("2d");
    } catch {
      setMode("2d");
    }
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);
  const mediaStatus = useCallback((s: string) => setMedia(s), []);
  const select = useCallback((id: string) => {
    const seat = seats.find((s) => s.id === id)!;
    const status = inventory[id];
    if (
      seat.blocked ||
      status?.status === "blocked" ||
      status?.status === "booked" ||
      (status?.status === "held" && !status.mine)
    ) {
      notify(`${id} is unavailable for this screening.`);
      return;
    }
    const group = seat.pair
      ? seats.filter((s) => s.pair === seat.pair).map((s) => s.id)
      : [id];
    if (
      group.some(
        (x) => inventory[x]?.status !== "available" && !inventory[x]?.mine,
      )
    ) {
      notify("Both recliner seats must be available.");
      return;
    }
    const next = selected.includes(id)
      ? selected.filter((x) => !group.includes(x))
      : [...new Set([...selected, ...group])];
    if (next.length > 8) {
      notify("You can select up to 8 seats per booking.");
      return;
    }
    onSelect(next);
    setPreview(id);
  }, [seats,inventory,selected,onSelect,notify]);
  const ignoreSelection = useCallback(() => {}, []);
  const presets: Preset[] = [
    "Overview",
    "From stage",
    ...(b.balcony ? ["Balcony" as Preset] : []),
    "Bird’s eye",
    "Tour",
  ];
  return (
    <div
      ref={viewport}
      className={`seat-experience${preset === "Tour" ? " is-touring" : ""}`}
      tabIndex={0}
      role="region"
      aria-label="Interactive auditorium"
      onKeyDown={(e) => {
        if (e.key === "Escape") setSettingsOpen(false);
        if (
          e.target !== e.currentTarget &&
          !(e.target instanceof HTMLCanvasElement)
        )
          return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          navigateView(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="view-top-controls">
        <div className="camera-presets">
          {presets.map((p) => (
            <button
              key={p}
              className={preset === p ? "selected" : ""}
              onClick={() => {
                setMode("3d");
                setPreset(p);
                if (p === "Tour") setViewIndex(0);
                setCameraCommand((c) => c + 1);
              }}
            >
              {p === "Tour" && <Play size={11} fill="currentColor" />}
              {p}
            </button>
          ))}
        </div>
        <button
          className="map-toggle"
          onClick={() => setMode(mode === "3d" ? "2d" : "3d")}
        >
          {mode === "3d" ? <Grid2X2 size={14} /> : <Box size={14} />}{" "}
          {mode === "3d" ? "2D map" : "3D view"}
        </button>
      </div>
      {mode === "3d" && preset === "Tour" && <nav className="auditorium-tour-stops" aria-label="Auditorium tour stops">
        <span>EXPLORE THE HALL</span>
        {tourStops.map((stop,index)=><button key={stop.label} title={stop.description} onClick={()=>{setViewIndex(index);setCameraCommand(c=>c+1);}}>
          <svg viewBox="0 0 56 34" aria-hidden="true"><path d="M8 5H48M8 29H48M8 5V29M48 5V29"/><path d="M14 9H42" className="tour-screen"/>
            {[16,21,26].map(y=><path key={y} d={`M14 ${y}Q28 ${y+3} 42 ${y}`}/>)}
            <circle cx={28+stop.position[0]/b.width*36} cy={10+(stop.position[2]+b.depth/2)/b.depth*18} r="2.5"/>
          </svg><span>{stop.label}<small>{stop.description}</small></span>
        </button>)}
      </nav>}
      {mode === "3d" ? (
        <SceneBoundary
          onError={() => {
            setMode("2d");
            notify("The accessible 2D seat map is ready.");
          }}
        >
          <Suspense
            fallback={
              <div className="scene-loading">
                <span className="spinner" />
                Loading your 3D cinema…
              </div>
            }
          >
            <Scene
              refined
              blueprint={b}
              seats={seats}
              inventory={inventory}
              selected={selected}
              onSelect={preset === "My seat" ? ignoreSelection : select}
              movie={movie}
              preset={preset}
              viewIndex={viewIndex}
              command={cameraCommand}
              onFreeView={freeView}
              lights={lights}
              hd={hd}
              muted={muted}
              paused={paused}
              preview={preview}
              onMediaStatus={mediaStatus}
              onPlaybackReady={playbackReady}
              onPlaybackState={setPlaybackState}
              onHover={setHover}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        <div className="seat-map">
          <div className="map-screen">
            <span>THE SCREEN IS HERE</span>
          </div>
          {b.balcony && <div className="map-levels" aria-label="Seating level">{[0,1].map(level=><button key={level} aria-pressed={mapLevel===level} onClick={()=>setMapLevel(level)}>{level===0?"Stalls":"Balcony"}</button>)}</div>}
          <div className="seat-map-scroll">
            {Array.from(new Set(seats.filter(s=>(s.level??(b.balcony && s.y>= (b.rows-(b.balconyRows??3))*b.slope+(b.balconyElevation??2.3) ? 1:0))===mapLevel).map((s) => s.row))).map((row) => (
              <div className="map-row" key={row} style={{width:b.width*30+70}}>
                <span className="map-row-label">{row}</span>
                {seats
                  .filter((s) => s.row === row)
                  .map((s) => {
                    const unavailable =
                      inventory[s.id]?.status === "booked" ||
                      inventory[s.id]?.status === "blocked" ||
                      s.blocked ||
                      (inventory[s.id]?.status === "held" &&
                        !inventory[s.id]?.mine);
                    return (
                      <button
                        key={s.id}
                        className={`map-seat ${selected.includes(s.id) ? "picked" : ""} ${unavailable ? "unavailable" : ""} ${s.accessible ? "accessible" : ""}`}
                        style={
                          {
                            "--seat-color": s.classDefinition?.color || seatFinishes[s.category]?.label || "#899bb8",
                            position: "absolute", left: 35+(s.x+b.width/2)*30-14,
                          } as React.CSSProperties
                        }
                        disabled={unavailable}
                        aria-label={`${s.id}, ${s.category}, ${unavailable ? "unavailable" : selected.includes(s.id) ? "selected" : "available"}${s.accessible ? ", wheelchair accessible" : ""}`}
                        aria-pressed={selected.includes(s.id)}
                        title={`${s.id} · ${rupees(seatPrice(s, data.show))}`}
                        onClick={() => select(s.id)}
                      >
                        {s.accessible ? "♿" : s.number}
                      </button>
                    );
                  })}
                <span className="map-row-label">{row}</span>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Seat labels run from the screen towards the back. Use Tab and Enter
            to choose your seats.
          </p>
        </div>
      )}
      {mode === "3d" && (
        <>
          {playbackBlocked && <button className="auditorium-start btn btn-gold" onClick={() => { playMedia.current?.play(); setPaused(false); }}><Play size={18} />Tap to start movie</button>}
          <button
            className="view-arrow view-arrow-left"
            aria-label="Previous auditorium viewpoint"
            onClick={() => navigateView(-1)}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            className="view-arrow view-arrow-right"
            aria-label="Next auditorium viewpoint"
            onClick={() => navigateView(1)}
          >
            <ArrowRight size={19} />
          </button>
          <div className="viewpoint-label" aria-live="polite">
            {preset === "Viewpoint"
              ? `${views[viewIndex].label} · View ${String(viewIndex + 1).padStart(2, "0")} / ${views.length}`
              : preset === "My seat"
                ? `Your view · ${preview}`
                : preset}
          </div>
          {preset === "My seat" && viewMetrics && <div className="seat-view-metrics" title="Approximate angles in this illustrative auditorium, not a measured venue.">Screen spans {viewMetrics.horizontalSpan}° / {Math.abs(viewMetrics.verticalAngle)}° {viewMetrics.verticalAngle >= 0 ? "upward" : "downward"}</div>}
          {preset === "My seat" && (
            <div className="seat-view-return">
              <button
                onClick={exitPreview}
              >
                <ArrowLeft size={14} />
                Exit Preview
              </button>
              {previewSeats.length > 1 && (
                <>
                <button aria-label="Previous Seat" onClick={() => nextPreview(-1)}><ArrowLeft size={14} /></button>
                <select
                  aria-label="Preview selected seat"
                  value={preview || selected[0]}
                  onChange={(e) => {
                    setPreview(e.target.value);
                    setCameraCommand((c) => c + 1);
                  }}
                >
                  {previewSeats.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <button aria-label="Next Seat" onClick={() => nextPreview(1)}><ArrowRight size={14} /></button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {hover && mode === "3d" && preset !== "My seat" && (
        <div className="seat-hover">
          <Armchair size={17} />
          <strong>{hover.id}</strong>
          <span>
            {hover.classDefinition?.name ?? categories.find((c) => c.id === hover.category)?.name ?? hover.category} ·{" "}
            {rupees(seatPrice(hover, data.show))}
            <small>{hover.blocked || ["booked","blocked"].includes(inventory[hover.id]?.status) || (inventory[hover.id]?.status === "held" && !inventory[hover.id]?.mine) ? "Unavailable" : selected.includes(hover.id) ? "Selected" : "Available"}</small>
          </span>
        </div>
      )}
      <div className="view-bottom-controls">
        <div className="scene-hints">
          {["loading", "ready", "buffering"].includes(playbackState) && <span className="trailer-loading-status" role="status"><i />{playbackState === "buffering" ? "Buffering trailer" : "Preparing trailer"}</span>}
          {playbackState === "ended" && <span role="status">Trailer ended ? Replay using the controls</span>}
          <span>
            {mode === "3d"
              ? "Drag to orbit · Scroll to zoom · Right-drag to pan"
              : "Accessible 2D seat selection"}
          </span>
          <small>
            {mode === "3d"
              ? media
              : "Same seats. Same availability. Your choice."}
          </small>
          {!canPlay && officialLink && (
            <a
              className="screen-official-link"
              href={officialLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch official trailer ↗
            </a>
          )}
        </div>
        <div className="scene-control-buttons">
          {playbackState === "error" && <button onClick={() => { setPaused(false); playMedia.current?.retry(); }} title="Retry trailer"><RotateCcw size={14} />Retry trailer</button>}
          {mode === "3d" && <button aria-label="Reset view" title="Reset view" onClick={() => { setPreset("Overview"); setCameraCommand(c => c+1); }}><RotateCcw size={14} /></button>}
          {previewSeats.length > 0 && preset !== "My seat" && <button aria-label="Find my seats" title="Find my seats" onClick={() => { setMode("3d"); setPreset("Find seats"); setCameraCommand(c => c+1); }}><LocateFixed size={14} /></button>}
          {previewSeats.length > 0 && (
            <button
              aria-label="View from this seat"
              title="View from this seat"
              className={preset === "My seat" ? "selected" : ""}
              onClick={() => {
                if (preset !== "My seat") previewOriginMode.current = mode;
                setPreview(previewSeats[previewSeats.length - 1]);
                setPreset("My seat");
                setCameraCommand((c) => c + 1);
                setMode("3d");
              }}
            >
              <Camera size={14} />
              <span className="seat-preview-button-label">View from this seat</span>
            </button>
          )}
          {canPlay && mode === "3d" && (
            <>
              <button
                title={playbackState === "ended" ? "Replay trailer" : paused || playbackBlocked ? "Play film" : "Pause film"}
                aria-label={
                  playbackState === "ended" ? "Replay trailer" : paused || playbackBlocked ? "Play film" : "Pause film"
                }
                onClick={() => {
                  if (paused || playbackBlocked || playbackState === "ended") {
                    playMedia.current?.play();
                    setPaused(false);
                  } else { playMedia.current?.pause(); setPaused(true); }
                }}
              >
                {paused || playbackBlocked || playbackState === "ended" ? (
                  <Play size={14} />
                ) : (
                  <Pause size={14} />
                )}
              </button>
              <button
                aria-label={muted ? "Unmute film" : "Mute film"}
                title={muted ? "Unmute film" : "Mute film"}
                onClick={() => { playMedia.current?.setMuted(!muted); setMuted(!muted); }}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </>
          )}
          <div className="scene-settings">
          <button className="scene-settings-toggle" title="More theatre controls" aria-label="More theatre controls" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open=>!open)}><SlidersHorizontal size={16}/></button>
          <div className={`scene-settings-panel ${settingsOpen ? "open" : ""}`}>
          <button onClick={() => setLights(!lights)} aria-pressed={lights}>
            <Lightbulb size={13} />
            Lights {lights ? "on" : "off"}
          </button>
          <button title="3D rendering quality. Trailer quality adapts automatically." aria-pressed={hd} onClick={() => setHd(!hd)}>
            {hd ? "HD" : "SD"}
          </button>
          <button
            aria-label="Fullscreen cinema"
            title="Fullscreen cinema"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen?.();
              else
                viewport.current
                  ?.requestFullscreen?.()
                  .catch(() =>
                    notify("Fullscreen is unavailable in this browser."),
                  );
            }}
          >
            <Maximize2 size={13} />
          </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function OrderSummary({
  show,
  movie,
  selected,
  promo,
  children,
}: {
  show: Show;
  movie: Movie;
  selected: Seat[];
  promo?: string;
  children?: ReactNode;
}) {
  const cart = useApp((s) => s.cart);
  const savedPromo = useApp(s=>s.showId===show.id ? s.promoCode : "");
  const appliedPromo = checkoutOffer(promo ?? savedPromo ?? "")?.code ?? "";
  const pricing = calculatePrice(selected, show, cart, appliedPromo);
  const venue = venues.find((v) => v.id === show.venueId)!;
  return (
    <aside className="order-summary">
      <span className="small-label">YOUR MOVIE MOMENT</span>
      <div className="summary-movie">
        <img src={movie.poster} alt={`${movie.title} poster`} />
        <div>
          <h3>{movie.title}</h3>
          <p>
            {show.language} · {show.format}
          </p>
          <span className="certificate">{movie.certificate}</span>
        </div>
      </div>
      <div className="summary-details">
        <strong>{venue.name}</strong>
        <span>{blueprints.find((b) => b.id === show.blueprintId)!.name}</span>
        <span>
          {new Date(show.date + "T12:00:00+05:30").toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}{" "}
          · {show.time} IST
        </span>
        <span className="summary-seat-names">
          <Armchair size={14} />
          {selected.map((s) => s.id).join(", ") || "No seats selected"}
        </span>
      </div>
      <div className="summary-lines">
        <div>
          <span>Tickets ({selected.length})</span>
          <span>{rupees(pricing.tickets)}</span>
        </div>
        {snacks
          .filter((s) => cart[s.id] > 0)
          .map((s) => (
            <div key={s.id}>
              <span>
                {s.name} × {cart[s.id]}
              </span>
              <span>{rupees(s.price * cart[s.id])}</span>
            </div>
          ))}
        <div>
          <span>Convenience fee</span>
          <span>{rupees(pricing.fee)}</span>
        </div>
        <div>
          <span>GST on convenience fee</span>
          <span>{rupees(pricing.tax)}</span>
        </div>
        {pricing.discount > 0 && (
          <div className="discount-line">
            <span>{appliedPromo} discount</span>
            <span>−{rupees(pricing.discount)}</span>
          </div>
        )}
      </div>
      <div className="summary-total">
        <span>Total amount</span>
        <strong className="price-update" key={pricing.total} aria-live="polite">{rupees(pricing.total)}</strong>
      </div>
      {children}
      <p className="summary-demo">
        <ShieldCheck size={14} />
        Demo booking. No real payment.
      </p>
    </aside>
  );
}
function SnacksStep({
  show,
  movie,
  selected,
  active,
}: {
  show: Show;
  movie: Movie;
  selected: Seat[];
  active: boolean;
}) {
  const [category, setCategory] = useState("All snacks");
  const cart = useApp((s) => s.cart);
  const setCart = useApp((s) => s.setCart);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <div className="checkout-columns snacks-layout">
      <section>
        <div className="page-intro compact">
          <span className="eyebrow">THE SUPPORTING CAST</span>
          <h1>
            A little crunch.
            <br />
            <span>A lot more cinema.</span>
          </h1>
          <p>The perfect companions to your main feature.</p>
        </div>
        <div className="chips">
          {[
            "All snacks",
            "Popcorn",
            "Nachos",
            "Beverages",
            "Combos",
            "Desserts",
          ].map((c) => (
            <button
              key={c}
              className={`chip ${c === category ? "selected" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="snack-grid">
          {snacks
            .filter((s) => category === "All snacks" || s.category === category)
            .map((s) => (
              <article
                className={`snack-card ${cart[s.id] > 0 ? "in-cart" : ""}`}
                key={s.id}
              >
                <div className="snack-art">
                  <img src={s.image} alt={s.name} />
                  <span className="vegetarian" title="Vegetarian">
                    ●
                  </span>
                  {cart[s.id] > 0 && (
                    <span className="snack-cart-badge">
                      <Check size={10} />
                      Added to your order
                    </span>
                  )}
                </div>
                <div className="snack-copy">
                  <span className="eyebrow">{s.category}</span>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div>
                    <strong>{rupees(s.price)}</strong>
                    {cart[s.id] > 0 ? (
                      <div className="quantity-control">
                        <button
                          aria-label={`Remove one ${s.name}`}
                          onClick={() => setCart(s.id, cart[s.id] - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <strong>{cart[s.id]}</strong>
                        <button
                          aria-label={`Add one ${s.name}`}
                          disabled={cart[s.id] >= 10}
                          onClick={() => setCart(s.id, cart[s.id] + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="snack-add"
                        onClick={() => setCart(s.id, 1)}
                      >
                        Add
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
        </div>
        <p className="fine-print">
          Sample menu and prices. Items are not real food orders.
        </p>
      </section>
      <OrderSummary show={show} movie={movie} selected={selected}>
        <Link
          aria-disabled={!active}
          className={`btn btn-gold ${!active ? "disabled" : ""}`}
          href={
            active ? `/booking/${encodeURIComponent(show.id)}/checkout` : "#"
          }
        >
          {count ? "Continue to checkout" : "Skip snacks & continue"}
          <ArrowRight size={16} />
        </Link>
        <Link
          className="summary-back"
          href={`/booking/${encodeURIComponent(show.id)}/seats`}
        >
          Change seats
        </Link>
      </OrderSummary>
    </div>
  );
}
function CheckoutStep(props: {show: Show; movie: Movie; selected: Seat[]; active: boolean; notify:(s:string)=>void}) {
  return <CheckoutExperience show={props.show} selected={props.selected} active={props.active} notify={props.notify} renderSummary={(promo,children)=><OrderSummary show={props.show} movie={props.movie} selected={props.selected} promo={promo}>{children}</OrderSummary>}/>;
}
