"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProfilePhoto from "./ProfilePhoto";
import AuthPosterCollage from "./AuthPosterCollage";
import DigitalTicket from "./DigitalTicket";
import CinematicTicketExperience from "./CinematicTicketExperience";
import { consumeTicketArrival } from "@/lib/ticket-experience";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Ticket,
  Heart,
  Armchair,
  User,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { api } from "@/lib/client";
import type { BookingRecord } from "@/lib/booking-record";
export type { BookingRecord } from "@/lib/booking-record";
import { Empty, Modal } from "./ui";
export function Auth({
  register = false,
  notify,
}: {
  register?: boolean;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const authParams=useSearchParams();
  const authNext=authParams.get("next")?`?next=${encodeURIComponent(authParams.get("next")!)}`:"";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  useEffect(() => { setError(""); setVisible(false); }, [register]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(register ? "register" : "login", values);
      window.dispatchEvent(new Event("mv-auth"));
      notify(register ? "Welcome to your universe." : "Good to have you back.");
      const next=new URLSearchParams(window.location.search).get("next");
      router.push(next&&/^\/(movies|genres|explore|watchlist|coming-soon)(\/|\?|$)/.test(next)&&!next.includes("\\")?next:"/account");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <AuthPosterCollage/>
      <section className="auth-story">
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
      <section className="auth-form-wrap" aria-labelledby="auth-title">
        <div className="auth-form-content" key={register ? "register" : "login"}>
        <span className="eyebrow">THE BEST STORIES BRING US TOGETHER</span>
        <h2 id="auth-title">{register ? "Join the universe." : "Welcome back."}</h2>
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
            {busy ? <span className="auth-spinner" aria-hidden="true"/> : <ArrowRight size={16} />}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already part of the story?" : "New to MovieVerse?"}{" "}
          <Link className="text-link" href={`${register ? "/login" : "/register"}${authNext}`} onNavigate={event => {
            // Both URLs share this form. Update the route without remounting its backdrop.
            event.preventDefault();
            window.history.pushState(null, "", `${register ? "/login" : "/register"}${window.location.search}`);
          }}>
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
        </div>
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
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("session")
      .then((x) => { if (active) setUser(x.user); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <main className="account-page section-container personal-lounge">
      <span className="eyebrow">YOUR CORNER OF THE UNIVERSE</span>
      <h1>
        {loading
          ? "Finding your profile…"
          : user
            ? `Hello, ${user.name.split(" ")[0]}.`
            : "Make yourself at home."}
      </h1>
      <p className="profile-welcome-copy">Your movie journey, all in one place.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {user ? (
        <>
          <div className="profile-card">
            <ProfilePhoto name={user.name} notify={notify}/>
            <div className="profile-identity">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="demo-badge">MOVIEVERSE DEMO ACCOUNT</span>
            </div>
            <button
              className="btn btn-outline"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={async () => {
                setSigningOut(true);
                try {
                  await api("logout", {});
                  window.dispatchEvent(new Event("mv-auth"));
                  notify("You’re signed out. See you at the movies.");
                  router.push("/");
                } catch (error) { setError(error instanceof Error ? error.message : "Could not sign out. Please try again."); }
                finally { setSigningOut(false); }
              }}
            >
              <LogOut size={15} />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
          <div className="account-links">
            <Link href="/watchlist"><Heart/><div><h3>Watchlist</h3><p>Your movie collection, saved to your account.</p></div><ArrowUpRight/></Link>
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
      <p className="demo-note profile-guest-notice">
        <Info size={17} aria-hidden="true"/><span>Guest bookings remain accessible on this browser. Signing in attaches
        this session’s guest bookings to your account.</span>
      </p>
    </main>
  );
}
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
    api<{ bookings: BookingRecord[] }>("tickets")
      .then((x) => setBookings(x.bookings))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  const [animateArrival, setAnimateArrival] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<{ bookings: BookingRecord[] }>("tickets")
      .then(({ bookings: records }) => {
        if (!active) return;
        const arrived = confirmation && id ? consumeTicketArrival(id) : false;
        setAnimateArrival(arrived && records.some(b => b.id === id && b.status === "confirmed"));
        setBookings(records);
      })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, confirmation]);
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
      {confirmation && !loading && !error && filtered.some(b => b.status === "confirmed") ? (
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
          <h1>{confirmation ? loading ? "Checking your booking…" : "Your booking." : id ? "Your movie ticket." : "Your movie moments."}</h1>
          <p>{confirmation ? "Your booking status and saved details appear here." : "Everything you need for your next escape."}</p>
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
        <Empty className="tickets-empty" action={<button
            className="btn btn-outline"
            onClick={() => {
              setLoading(true);
              setError("");
              refresh();
            }}
          >
            Try again
          </button>} title="We couldn’t load your tickets">
          {error}

        </Empty>
      ) : filtered.length ? (
        <div className="ticket-list">
          {filtered.map((b) => confirmation && b.status === "confirmed" ? (
            <CinematicTicketExperience
              key={b.id}
              booking={b}
              animate={animateArrival}
              onCancel={() => setCancel(b)}
              notify={notify}
            />
          ) : (
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
          className="tickets-empty"
          title={id ? "Ticket not found" : "Your next movie moment is waiting."}
          action={<Link className="btn btn-gold" href={id ? "/login" : "/movies"}>
            {id ? "Sign in" : "Find your next movie"}
            <ArrowRight size={16} />
          </Link>}
        >
          {id
            ? "This ticket belongs to a different session or account. Sign in to the account used to book."
            : "You haven’t booked a movie in this category yet."}
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
export function VerifyTicket({ token }: { token: string }) {
  type Verification = { id: string; status: string; movie: string; seats: string[]; demo: boolean };
  const [result, setResult] = useState<{token: string; data?: Verification; error?: string}>({token});
  const {data, error} = result.token === token ? result : {data: undefined, error: ""};
  useEffect(() => {
    let active = true;
    api<Verification>(`ticket?token=${encodeURIComponent(token)}`)
      .then(data => { if (active) setResult({token, data}); })
      .catch(error => { if (active) setResult({token, error: error.message}); });
    return () => { active = false; };
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
              : data.status === "cancelled" ? "Booking cancelled." : data.status === "failed" ? "Booking failed." : "Awaiting booking confirmation."
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
