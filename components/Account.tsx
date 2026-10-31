"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Download,
  Ticket,
  Armchair,
  MapPin,
  Clock,
  User,
  LogOut,
  ShieldCheck,
  Mail,
  Eye,
  EyeOff,
  X,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/client";
import { rupees } from "@/lib/booking";
import { Logo, Empty, Modal } from "./ui";
export function Auth({
  register = false,
  notify,
}: {
  register?: boolean;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(register ? "register" : "login", values);
      window.dispatchEvent(new Event("mv-auth"));
      notify(register ? "Welcome to your universe." : "Good to have you back.");
      router.push("/account");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-art">
          <img src="/assets/varanasi.webp" alt="" />
          <img src="/assets/jailer-2.webp" alt="" />
          <img src="/assets/toxic.webp" alt="" />
        </div>
        <div>
          <span className="eyebrow">MORE THAN A MOVIE TICKET</span>
          <h1>
            Your universe.
            <br />
            Your movie.
            <br />
            <span>Your seat.</span>
          </h1>
          <p>Every great story starts with showing up.</p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <span className="eyebrow">THE BEST STORIES BRING US TOGETHER</span>
        <h2>{register ? "Join the universe." : "Welcome back."}</h2>
        <p>
          {register
            ? "A little about you. A whole world of cinema."
            : "Your next great movie moment is waiting."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input
                name="name"
                placeholder="Your name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <div className="password-input">
              <input
                name="password"
                type={visible ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
                required
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                className="icon-btn"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-gold" disabled={busy} type="submit">
            {busy
              ? "One moment…"
              : register
                ? "Create your account"
                : "Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already part of the story?" : "New to MovieVerse?"}{" "}
          <Link className="text-link" href={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <Link className="guest-link" href="/movies">
          Keep exploring as a guest
          <ArrowUpRight size={13} />
        </Link>
        <p className="fine-print">
          <ShieldCheck size={13} /> Demo accounts use securely hashed passwords.
          Payments and bookings are demonstrations.
        </p>
      </section>
    </main>
  );
}
export function Account({ notify }: { notify: (s: string) => void }) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api("session")
      .then((x) => setUser(x.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="account-page section-container">
      <span className="eyebrow">YOUR CORNER OF THE UNIVERSE</span>
      <h1>
        {loading
          ? "Finding your profile…"
          : user
            ? `Hello, ${user.name.split(" ")[0]}.`
            : "Make yourself at home."}
      </h1>
      {error && <p className="form-error">{error}</p>}
      {user ? (
        <>
          <div className="profile-card">
            <span className="profile-avatar">{user.name.slice(0, 1)}</span>
            <div>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="demo-badge">MOVIEVERSE DEMO ACCOUNT</span>
            </div>
            <button
              className="btn btn-outline"
              onClick={async () => {
                await api("logout", {});
                window.dispatchEvent(new Event("mv-auth"));
                notify("You’re signed out. See you at the movies.");
                router.push("/");
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
          <div className="account-links">
            <Link href="/my-tickets">
              <Ticket />
              <div>
                <h3>My tickets</h3>
                <p>Your movie moments, all together.</p>
              </div>
              <ArrowUpRight />
            </Link>
            <Link href="/movies">
              <Armchair />
              <div>
                <h3>Your next movie</h3>
                <p>There’s always another great story.</p>
              </div>
              <ArrowUpRight />
            </Link>
          </div>
        </>
      ) : (
        !loading && (
          <div className="empty">
            <User size={36} />
            <h2>Your next chapter starts here.</h2>
            <p>Sign in to keep your demo bookings across browser sessions.</p>
            <Link className="btn btn-gold" href="/login">
              Sign in
              <ArrowRight size={15} />
            </Link>
          </div>
        )
      )}
      <p className="demo-note">
        Guest bookings remain accessible on this browser. Signing in attaches
        this session’s guest bookings to your account.
      </p>
    </main>
  );
}
export type BookingRecord = {
  id: string;
  status: string;
  created: number;
  token: string;
  seats: string[];
  pricing: {
    total: number;
    tickets: number;
    food: number;
    fee: number;
    tax: number;
    discount: number;
  };
  cart: Record<string, number>;
  snapshot: {
    movie: { title: string; poster: string; certificate: string };
    venue: { name: string; address: string };
    show: { date: string; time: string; language: string; format: string };
    auditorium: string;
  };
};
export function MyTickets({
  id,
  confirmation = false,
  notify,
}: {
  id?: string;
  confirmation?: boolean;
  notify: (s: string) => void;
}) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Upcoming");
  const [cancel, setCancel] = useState<BookingRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    api("tickets")
      .then((x) => setBookings(x.bookings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);
  const filtered = bookings.filter((b) =>
    id
      ? b.id === id
      : tab === "Cancelled"
        ? b.status === "cancelled"
        : b.status !== "cancelled" &&
          (tab === "Upcoming"
            ? new Date(
                `${b.snapshot.show.date}T${b.snapshot.show.time}:00+05:30`,
              ).getTime() >= Date.now()
            : new Date(
                `${b.snapshot.show.date}T${b.snapshot.show.time}:00+05:30`,
              ).getTime() < Date.now()),
  );
  return (
    <main
      className={`tickets-page section-container ${confirmation ? "confirmation-page" : ""}`}
    >
      {confirmation ? (
        <div className="confirmation-heading">
          <div>
            <Check size={32} />
          </div>
          <span className="eyebrow">THE NEXT GREAT STORY IS YOURS</span>
          <h1>
            You’re going to <span>the movies.</span>
          </h1>
          <p>
            Your demo booking is confirmed. All that’s left is the opening
            scene.
          </p>
          <span className="demo-badge">
            SIMULATED PAYMENT · NO MONEY CHARGED
          </span>
        </div>
      ) : (
        <div className="page-intro">
          <span className="eyebrow">LITTLE TICKETS. BIG MEMORIES.</span>
          <h1>{id ? "Your movie ticket." : "Your movie moments."}</h1>
          <p>Everything you need for your next escape.</p>
        </div>
      )}
      {!id && (
        <div className="ticket-tabs">
          {["Upcoming", "Past", "Cancelled"].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="empty">
          <span className="spinner" />
          <p>Finding your movie moments…</p>
        </div>
      ) : error ? (
        <Empty title="We couldn’t load your tickets">
          {error}
          <button
            className="btn btn-outline"
            onClick={() => {
              setLoading(true);
              setError("");
              refresh();
            }}
          >
            Try again
          </button>
        </Empty>
      ) : filtered.length ? (
        <div className="ticket-list">
          {filtered.map((b) => (
            <DigitalTicket
              key={b.id}
              booking={b}
              onCancel={() => setCancel(b)}
              notify={notify}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={id ? "Ticket not found" : "Your next movie moment is waiting."}
        >
          {id
            ? "This ticket belongs to a different session or account. Sign in to the account used to book."
            : "You haven’t booked a movie in this category yet."}
          <Link className="btn btn-gold" href={id ? "/login" : "/movies"}>
            {id ? "Sign in" : "Find your next movie"}
            <ArrowRight size={16} />
          </Link>
        </Empty>
      )}
      {confirmation && filtered.length > 0 && (
        <div className="confirmation-links">
          <Link href="/my-tickets" className="btn btn-outline">
            My tickets
            <Ticket size={15} />
          </Link>
          <Link href="/movies" className="text-link">
            Find another story
            <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
      {cancel && (
        <Modal title="Cancel demo booking" onClose={() => setCancel(null)}>
          <span className="eyebrow">PLANS CHANGE</span>
          <h2>Cancel this movie moment?</h2>
          <p>
            Your demo seats for {cancel.snapshot.movie.title} will be released.
            No real refund is involved.
          </p>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => setCancel(null)}>
              Keep my tickets
            </button>
            <button
              className="btn btn-gold"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("cancel-booking", { id: cancel.id });
                  setCancel(null);
                  refresh();
                  notify(
                    "Demo booking cancelled. Your seats have been released.",
                  );
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function DigitalTicket({
  booking: b,
  onCancel,
  notify,
}: {
  booking: BookingRecord;
  onCancel: () => void;
  notify: (s: string) => void;
}) {
  const [qr, setQr] = useState("");
  const snap = b.snapshot;
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/ticket/${b.token}`, {
      width: 280,
      margin: 1,
      color: { dark: "#090b12", light: "#ffffff" },
    }).then(setQr);
  }, [b.token]);
  async function download() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1120;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#101117";
      ctx.fillRect(0, 0, 800, 1120);
      ctx.fillStyle = "#f9be3c";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("MOVIEVERSE", 48, 64);
      ctx.fillStyle = "#a2a4b4";
      ctx.font = "15px sans-serif";
      ctx.fillText("YOUR UNIVERSE. YOUR MOVIE. YOUR SEAT.", 48, 98);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText(snap.movie.title, 48, 180);
      ctx.font = "23px sans-serif";
      [
        snap.venue.name,
        snap.auditorium,
        `${snap.show.date}  ·  ${snap.show.time} IST`,
        `${snap.show.language}  ·  ${snap.show.format}`,
        `Seats: ${b.seats.join(", ")}`,
        `Total: ${rupees(b.pricing.total)}  ·  ${b.status.toUpperCase()}`,
      ].forEach((t, i) => ctx.fillText(t, 48, 248 + i * 47));
      ctx.strokeStyle = "#383943";
      ctx.setLineDash([7, 8]);
      ctx.beginPath();
      ctx.moveTo(48, 550);
      ctx.lineTo(752, 550);
      ctx.stroke();
      const image = new Image();
      image.src = qr;
      await image.decode();
      ctx.drawImage(image, 260, 590, 280, 280);
      ctx.font = "15px monospace";
      ctx.fillStyle = "#a2a4b4";
      ctx.fillText(`Booking ${b.id}`, 48, 930);
      ctx.font = "17px sans-serif";
      ctx.fillStyle = "#f9be3c";
      ctx.fillText("DEMO TICKET · NO REAL CINEMA ADMISSION", 48, 990);
      ctx.fillStyle = "#a2a4b4";
      ctx.fillText("Simulated payment. No money was charged.", 48, 1030);
      const link = document.createElement("a");
      link.download = `MovieVerse-${b.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      notify(
        "Ticket download is unavailable. Your QR ticket is still visible here.",
      );
    }
  }
  const future =
    new Date(`${snap.show.date}T${snap.show.time}:00+05:30`).getTime() >
    Date.now();
  return (
    <article
      className={`digital-ticket ${b.status === "cancelled" ? "cancelled" : ""}`}
    >
      <div className="ticket-main">
        <div className="ticket-brand">
          <Logo />
          <span
            className={`ticket-status ${b.status === "cancelled" ? "cancelled" : ""}`}
          >
            {b.status === "cancelled" ? (
              <X size={12} />
            ) : (
              <CheckCircle2 size={12} />
            )}{" "}
            {b.status === "confirmed" ? "BOOKING CONFIRMED" : "CANCELLED"}
          </span>
        </div>
        <div className="ticket-movie">
          <img src={snap.movie.poster} alt="" />
          <div>
            <span className="eyebrow">
              {snap.show.language} · {snap.show.format} ·{" "}
              {snap.movie.certificate}
            </span>
            <h2>{snap.movie.title}</h2>
            <p>{snap.venue.name}</p>
            <small>{snap.venue.address}</small>
          </div>
        </div>
        <div className="ticket-facts">
          <div>
            <span>DATE & TIME</span>
            <strong>
              {new Date(snap.show.date + "T12:00:00+05:30").toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short", weekday: "short" },
              )}
            </strong>
            <small>{snap.show.time} IST</small>
          </div>
          <div>
            <span>AUDITORIUM</span>
            <strong>{snap.auditorium.split(" · ")[0]}</strong>
            <small>{snap.auditorium.split(" · ")[1]}</small>
          </div>
          <div>
            <span>YOUR SEATS</span>
            <strong>{b.seats.join(", ")}</strong>
            <small>
              {b.seats.length} ticket{b.seats.length > 1 ? "s" : ""}
            </small>
          </div>
        </div>
        <div className="ticket-footer">
          <span>
            BOOKING ID <strong>{b.id.slice(0, 8).toUpperCase()}</strong>
          </span>
          <span>
            Total <strong>{rupees(b.pricing.total)}</strong>
          </span>
        </div>
      </div>
      <div className="ticket-stub">
        {qr && (
          <img
            className="qr-code"
            src={qr}
            alt={`QR verification for booking ${b.id.slice(0, 8)}`}
          />
        )}
        <strong>YOUR NEXT GREAT ESCAPE</strong>
        <p>Demo ticket · no cinema admission</p>
        <button className="btn btn-gold" onClick={download} disabled={!qr}>
          <Download size={15} />
          Download ticket
        </button>
        {future && b.status !== "cancelled" && (
          <button className="cancel-ticket" onClick={onCancel}>
            Cancel demo booking
          </button>
        )}
      </div>
    </article>
  );
}
export function VerifyTicket({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`ticket?token=${encodeURIComponent(token)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <main className="empty ticket-verification">
      <Ticket size={40} />
      <span className="eyebrow">MOVIEVERSE DEMO TICKET</span>
      <h1>
        {error
          ? "Ticket not found"
          : data
            ? data.status === "confirmed"
              ? "Booking verified."
              : "Booking cancelled."
            : "Checking your ticket…"}
      </h1>
      {error ? (
        <p>{error}</p>
      ) : (
        data && (
          <>
            <h2>{data.movie}</h2>
            <p>Seats {data.seats.join(", ")}</p>
            <p className="fine-print">
              This is a simulated ticket and does not grant cinema admission.
            </p>
          </>
        )
      )}
    </main>
  );
}
