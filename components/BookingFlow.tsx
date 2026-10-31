"use client";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Sparkles,
  Eye,
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
  Popcorn,
  Utensils,
  Ticket,
  AlertCircle,
} from "lucide-react";
import {
  blueprints,
  categories,
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
import type { Preset } from "./SeatScene";
const Scene = lazy(() => import("./SeatScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
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
  const cart = useApp((s) => s.cart);
  const expiry = useApp((s) => s.holdExpires);
  const setExpiry = useApp((s) => s.setExpiry);
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setShow(showId);
  }, [showId, setShow]);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api<InventoryResponse>(`inventory?show=${encodeURIComponent(showId)}`)
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
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
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
      const result = await api("hold", { showId, seats: ids });
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
                data={data}
                movie={movie}
                selected={ids}
                onSelect={(newIds) => setSeats(newIds)}
                notify={notify}
              />
            )}
          </section>
          <aside className="booking-sidebar">
            <div className="sidebar-content">
              <span className="small-label">SEAT CLASSES</span>
              <div className="seat-categories">
                {[...categories]
                  .reverse()
                  .filter((c) => allSeats.some((s) => s.category === c.id))
                  .map((c) => (
                    <div className="seat-class" key={c.id}>
                      <i style={{ background: c.color }} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.description}</small>
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
                    </div>
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
                  <i className="accessible" />
                  Accessible
                </span>
              </div>
              <BestSeats
                data={data}
                selected={ids}
                onPick={setSeats}
                notify={notify}
              />
              <div className="your-seats">
                <span className="small-label">
                  YOUR SEATS{" "}
                  <span>{selected.length ? `(${selected.length})` : ""}</span>
                </span>
                {selected.length ? (
                  <div className="selected-seats-list">
                    {selected.map((s) => (
                      <div key={s.id}>
                        <span className="selected-seat-icon">
                          <Armchair size={17} />
                        </span>
                        <span>
                          <strong>{s.id}</strong>
                          <small>
                            {categories.find((c) => c.id === s.category)!.name}
                          </small>
                        </span>
                        <strong>{rupees(seatPrice(s, show))}</strong>
                        <button
                          className="icon-btn"
                          aria-label={`Remove ${s.id}`}
                          onClick={() => {
                            const next = selected.filter(
                              (x) =>
                                x.id !== s.id && (!s.pair || x.pair !== s.pair),
                            );
                            setSeats(next.map((s) => s.id));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-seats">
                    Click any seat in the hall, or let us pick the best ones.
                  </p>
                )}
              </div>
              <div className="layout-note">
                <Info size={14} />
                <p>
                  {b.name}
                  <br />
                  {allSeats.length} seats · Illustrative demo layout.
                  <br />
                  Not a measured real-world auditorium.
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
                <strong>
                  {rupees(calculatePrice(selected, show, {}).total)}
                </strong>
              </div>
              <button
                className="btn btn-gold"
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
          <div className="booking-progress">
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
function BestSeats({
  data,
  selected,
  onPick,
  notify,
}: {
  data: InventoryResponse | null;
  selected: string[];
  onPick: (ids: string[]) => void;
  notify: (s: string) => void;
}) {
  const [count, setCount] = useState(2);
  const [category, setCategory] = useState("all");
  return (
    <div className="quick-pick">
      <span className="small-label">QUICK PICK</span>
      <select
        aria-label="Preferred seat class"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="all">Any seat class</option>
        {categories
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
  const [preset, setPreset] = useState<Preset>("Overview");
  const [lights, setLights] = useState(true);
  const [hd, setHd] = useState(true);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [hover, setHover] = useState<Seat | null>(null);
  const [media, setMedia] = useState("Loading screen…");
  const viewport = useRef<HTMLDivElement>(null);
  const { blueprint: b, seats, inventory } = data;
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
  function select(id: string) {
    const seat = seats.find((s) => s.id === id)!;
    const status = inventory[id];
    if (
      seat.blocked ||
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
  }
  const presets: Preset[] = [
    "Overview",
    "From stage",
    ...(b.balcony ? ["Balcony" as Preset] : []),
    "Bird’s eye",
    "Tour",
  ];
  return (
    <div ref={viewport} className="seat-experience">
      <div className="view-top-controls">
        <div className="camera-presets">
          {presets.map((p) => (
            <button
              key={p}
              className={preset === p ? "selected" : ""}
              onClick={() => {
                setMode("3d");
                setPreset(p);
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
              blueprint={b}
              seats={seats}
              inventory={inventory}
              selected={selected}
              onSelect={select}
              movie={movie}
              preset={preset}
              lights={lights}
              hd={hd}
              muted={muted}
              paused={paused}
              preview={preview}
              onMediaStatus={mediaStatus}
              onHover={setHover}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        <div className="seat-map">
          <div className="map-screen">
            <span>THE SCREEN IS HERE</span>
          </div>
          <div className="seat-map-scroll">
            {Array.from(new Set(seats.map((s) => s.row))).map((row) => (
              <div className="map-row" key={row}>
                <span className="map-row-label">{row}</span>
                {seats
                  .filter((s) => s.row === row)
                  .map((s, i, arr) => {
                    const unavailable =
                      inventory[s.id]?.status === "booked" ||
                      s.blocked ||
                      (inventory[s.id]?.status === "held" &&
                        !inventory[s.id]?.mine);
                    const aisle = i > 0 && s.x - arr[i - 1].x > b.spacing * 1.2;
                    return (
                      <button
                        key={s.id}
                        className={`map-seat ${selected.includes(s.id) ? "picked" : ""} ${unavailable ? "unavailable" : ""} ${s.accessible ? "accessible" : ""}`}
                        style={
                          {
                            "--seat-color": categories.find(
                              (c) => c.id === s.category,
                            )!.color,
                            marginLeft: aisle ? "15px" : undefined,
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
      {hover && mode === "3d" && (
        <div className="seat-hover">
          <Armchair size={17} />
          <strong>{hover.id}</strong>
          <span>
            {categories.find((c) => c.id === hover.category)!.name} ·{" "}
            {rupees(seatPrice(hover, data.show))}
          </span>
        </div>
      )}
      <div className="view-bottom-controls">
        <div className="scene-hints">
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
        </div>
        <div className="scene-control-buttons">
          {selected.length > 0 && (
            <button
              className={preset === "My seat" ? "selected" : ""}
              onClick={() => {
                setPreview(selected[selected.length - 1]);
                setPreset("My seat");
                setMode("3d");
              }}
            >
              <Eye size={14} />
              My view
            </button>
          )}
          {movie.trailer && mode === "3d" && (
            <>
              <button
                aria-label={paused ? "Play film" : "Pause film"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                aria-label={muted ? "Unmute film" : "Mute film"}
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </>
          )}
          <button onClick={() => setLights(!lights)} aria-pressed={lights}>
            <Lightbulb size={13} />
            Lights {lights ? "on" : "off"}
          </button>
          <button aria-pressed={hd} onClick={() => setHd(!hd)}>
            {hd ? "HD" : "SD"}
          </button>
          <button
            aria-label="Fullscreen cinema"
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
  );
}
export function OrderSummary({
  show,
  movie,
  selected,
  promo = "",
  children,
}: {
  show: Show;
  movie: Movie;
  selected: Seat[];
  promo?: string;
  children?: ReactNode;
}) {
  const cart = useApp((s) => s.cart);
  const pricing = calculatePrice(selected, show, cart, promo);
  const venue = venues.find((v) => v.id === show.venueId)!;
  return (
    <aside className="order-summary">
      <span className="small-label">YOUR MOVIE MOMENT</span>
      <div className="summary-movie">
        <img src={movie.poster} alt="" />
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
            <span>FIRSTSHOW discount</span>
            <span>−{rupees(pricing.discount)}</span>
          </div>
        )}
      </div>
      <div className="summary-total">
        <span>Total amount</span>
        <strong>{rupees(pricing.total)}</strong>
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
    <div className="checkout-columns">
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
              <article className="snack-card" key={s.id}>
                <div className="snack-art">
                  <img src={s.image} alt={s.name} />
                  <span className="vegetarian" title="Vegetarian">
                    ●
                  </span>
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
function CheckoutStep({
  show,
  movie,
  selected,
  active,
  notify,
}: {
  show: Show;
  movie: Movie;
  selected: Seat[];
  active: boolean;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const cart = useApp((s) => s.cart);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState("");
  const [method, setMethod] = useState("UPI");
  const [outcome, setOutcome] = useState<"success" | "failure" | "cancel">(
    "success",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(crypto.randomUUID());
  const pricing = calculatePrice(selected, show, cart, promo);
  useEffect(() => {
    api("session")
      .then((x) => {
        if (x.user) {
          setName(x.user.name);
          setEmail(x.user.email);
        }
      })
      .catch(() => {});
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !selected.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("checkout", {
        showId: show.id,
        seats: selected.map((s) => s.id),
        cart,
        promo,
        requestId: request.current,
        outcome,
      });
      router.push(`/booking/confirmation/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="checkout-columns" onSubmit={submit}>
      <section>
        <div className="page-intro compact">
          <span className="eyebrow">YOU’RE ONE SCENE AWAY</span>
          <h1>
            Make it <span>official.</span>
          </h1>
          <p>Your story. Your seats. All in one place.</p>
        </div>
        <div className="checkout-block">
          <div className="block-heading">
            <span>01</span>
            <div>
              <h3>A name for your ticket.</h3>
              <p>Demo details stay in this form. No email is sent.</p>
            </div>
          </div>
          <div className="form-row">
            <label>
              Your name
              <input
                required
                autoComplete="name"
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Movie lover"
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          </div>
        </div>
        <div className="checkout-block">
          <div className="block-heading">
            <span>02</span>
            <div>
              <h3>A little treat, on us.</h3>
              <p>Try FIRSTSHOW for 10% off tickets, up to ₹100.</p>
            </div>
          </div>
          <div className="promo-input">
            <input
              aria-label="Promo code"
              placeholder="Enter promo code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (promoInput === "FIRSTSHOW") {
                  setPromo(promoInput);
                  notify("FIRSTSHOW applied. Enjoy your movie.");
                } else {
                  setPromo("");
                  notify("That code isn’t valid. Try FIRSTSHOW.");
                }
              }}
            >
              {promo ? "Applied ✓" : "Apply"}
            </button>
          </div>
        </div>
        <div className="checkout-block">
          <div className="block-heading">
            <span>03</span>
            <div>
              <h3>The final step.</h3>
              <p>A simulated payment. No real money changes hands.</p>
            </div>
          </div>
          <div className="payment-methods">
            {["UPI", "Card", "Net banking"].map((m) => (
              <button
                key={m}
                type="button"
                className={m === method ? "selected" : ""}
                onClick={() => setMethod(m)}
              >
                {m === method && <Check size={14} />} {m}
              </button>
            ))}
          </div>
          <div className="test-payment">
            <ShieldCheck size={25} />
            <div>
              <strong>{method} · Test payment</strong>
              <p>
                No bank details required. Choose a result to test the complete
                payment flow.
              </p>
            </div>
          </div>
          <label className="test-outcome">
            Simulated result
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            >
              <option value="success">Successful payment</option>
              <option value="failure">Payment failure</option>
              <option value="cancel">Payment cancelled</option>
            </select>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        <p className="fine-print">
          This is a demonstration reservation. The QR ticket is valid only
          within this demo. You can cancel a confirmed demo booking before its
          screening starts.
        </p>
      </section>
      <OrderSummary show={show} movie={movie} selected={selected} promo={promo}>
        <button
          className="btn btn-gold"
          type="submit"
          disabled={!active || !selected.length || busy}
        >
          {busy
            ? "Confirming your booking…"
            : `Pay ${rupees(pricing.total)} · Test payment`}
          <ArrowRight size={16} />
        </button>
        <Link
          className="summary-back"
          href={`/booking/${encodeURIComponent(show.id)}/snacks`}
        >
          Edit snacks
        </Link>
      </OrderSummary>
    </form>
  );
}
