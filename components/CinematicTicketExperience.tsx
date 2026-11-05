"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import type { BookingRecord } from "./Account";
import DigitalTicket from "./DigitalTicket";

type AnimationPhase = "ready" | "preparing" | "printing" | "stamping" | "completed";

/** CSS owns the coordinated timeline; React waits for the real ticket assets. */
export default function CinematicTicketExperience({ booking, animate, onCancel, notify }: {
  booking: BookingRecord;
  animate: boolean;
  onCancel: () => void;
  notify: (message: string) => void;
}) {
  const [phase, setPhase] = useState<AnimationPhase>(() =>
    animate && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "ready"
      : "completed",
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const ticketReady = useRef(false);
  const prepTimer = useRef<number | null>(null);
  const host = useRef<HTMLElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const replay = useRef<HTMLButtonElement>(null);
  const wasActive = useRef(false);
  const confirmed = booking.status === "confirmed";
  const active = confirmed && phase !== "completed";
  const printerStatus = phase === "ready" ? "READY" : phase === "preparing" ? "PREPARING" : phase === "printing" ? "PRINTING" : "BOOKING CONFIRMED";

  const beginFeed = useCallback(() => {
    if (prepTimer.current !== null || phaseRef.current !== "preparing") return;
    prepTimer.current = window.setTimeout(() => {
      prepTimer.current = null;
      if (phaseRef.current === "preparing") setPhase("printing");
    }, 450);
  }, []);

  const handleReady = useCallback(() => {
    ticketReady.current = true;
    beginFeed();
  }, [beginFeed]);

  const finish = useCallback(() => {
    if (prepTimer.current !== null) window.clearTimeout(prepTimer.current);
    prepTimer.current = null;
    setPhase("completed");
  }, []);

  useEffect(() => {
    if (animate && confirmed && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setPhase(current => current === "completed" ? "ready" : current);
  }, [animate, confirmed]);

  useEffect(() => {
    if (phase !== "ready") return;
    const timeout = window.setTimeout(() => setPhase(current => current === "ready" ? "preparing" : current), 240);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase === "preparing" && ticketReady.current) beginFeed();
  }, [phase, beginFeed]);

  useEffect(() => {
    if (phase !== "printing") return;
    const timeout = window.setTimeout(() => setPhase("stamping"), 2800);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "stamping") return;
    const timeout = window.setTimeout(finish, 700);
    return () => window.clearTimeout(timeout);
  }, [phase, finish]);

  useEffect(() => {
    if (!active) {
      if (wasActive.current) replay.current?.focus({ preventScroll: true });
      return;
    }
    wasActive.current = true;
    window.scrollTo({ top: 0, behavior: "instant" });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => { if (motion.matches) finish(); };
    onMotion();
    motion.addEventListener("change", onMotion);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Make every branch outside this overlay inert, preserving prior state.
    const siblings: Array<[HTMLElement, boolean]> = [];
    let branch: HTMLElement | null = host.current;
    while (branch && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement?.children || [])) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          siblings.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    skip.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(); }
      if (event.key === "Tab") { event.preventDefault(); skip.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      siblings.forEach(([element, previous]) => { element.inert = previous; });
    };
  }, [active, finish]);

  useEffect(() => () => {
    if (prepTimer.current !== null) window.clearTimeout(prepTimer.current);
  }, []);

  function startReplay() {
    if (!confirmed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      notify("Your completed ticket is ready. Reduced motion is enabled.");
      return;
    }
    setPhase("ready");
  }

  const phaseClass = phase === "ready" ? "is-ready" : phase === "preparing" ? "is-preparing" : phase === "printing" ? "is-feeding" : phase === "stamping" ? "is-stamping" : "";
  return (
    <section ref={host} className={`ticket-experience ${active ? "is-printing" : "is-complete"} ${phaseClass}`} role={active ? "dialog" : undefined} aria-modal={active || undefined} aria-label={active ? "Your movie night is confirmed" : "Your digital ticket"} data-animation={phase}>
      {confirmed && <div className="ticket-experience-intro">
        <span className="ticket-confirmation-light"><CheckCircle2 size={14} /> BOOKING CONFIRMED</span>
        <h2>YOUR MOVIE NIGHT <br /><em>IS CONFIRMED</em></h2>
        {active && <button ref={skip} className="ticket-skip" onClick={finish}>Skip animation</button>}
      </div>}
      <div className="ticket-printer-stage">
        {confirmed && <div className="ticket-dispenser" aria-hidden="true" data-status={phase}>
          <div className="printer-top-shell">
            <span>MV · THERMAL SYSTEM</span>
            <span className="printer-vent-lines" />
            <i className="printer-shell-screw" />
          </div>
          <div className="printer-metal-panel">
            <div className="printer-branding">
              <img src="/assets/movieverse-logo.png" alt="" width={649} height={117} />
              <span>CINEMA TICKET SYSTEM <i>MV–01</i></span>
            </div>
            <div className="printer-status-display">
              <i className={`printer-status-light ${phase === "preparing" || phase === "printing" ? "is-on" : "is-ready"}`} />
              <span><small>PRINTER STATUS</small><strong>{printerStatus}</strong></span>
            </div>
            <div className="printer-control-cluster">
              <i className="printer-power-light" />
              <span>POWER</span>
              <i className="printer-control-button" />
            </div>
          </div>
          <div className="printer-slot-surround">
            <div className="printer-output-slot">
              <span className="printer-slot-glow" />
              <span className="printer-cutter" />
            </div>
          </div>
        </div>}
        <div className="ticket-output-track" inert={active} aria-hidden={active || undefined}>
          <div className="emerging-ticket">
            <DigitalTicket landscape booking={booking} onCancel={onCancel} notify={notify} onReady={handleReady} />
          </div>
        </div>
      </div>
      {!active && confirmed && <button ref={replay} className="ticket-replay text-link" onClick={startReplay}><RotateCcw size={14} /> Replay animation</button>}
      <p className="sr-only" role="status">{confirmed ? active ? phase === "ready" ? "Booking confirmed. The ticket printer is ready." : phase === "preparing" ? "Booking confirmed. Preparing your complete ticket." : "Booking confirmed. Your ticket is printing." : "Your confirmed ticket is ready to download or print." : "Booking is not confirmed."}</p>
    </section>
  );
}
