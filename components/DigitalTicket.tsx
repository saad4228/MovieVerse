"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Armchair, CalendarDays, Check, CheckCircle2, Clock, Copy, Download, IndianRupee, MapPin, Monitor, Printer, Ticket, X } from "lucide-react";
import type { BookingRecord } from "./Account";
import { Logo } from "./ui";
import { rupees } from "@/lib/booking";
import { ticketImage } from "@/lib/ticket-image";
import { bookingStatusLabel } from "@/lib/ticket-experience";
import { prepareTicketPrint, ticketQr } from "@/lib/ticket-print";

const bookingDate = (value: number | string) => new Date(value).toLocaleDateString("en-IN", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
});

export default function DigitalTicket({ booking: b, onCancel, notify, onReady, landscape = false }: {
  booking: BookingRecord;
  onCancel: () => void;
  notify: (message: string) => void;
  onReady?: () => void;
  landscape?: boolean;
}) {
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const [qrAttempt, setQrAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const article = useRef<HTMLElement>(null);
  const artworkImage = useRef<HTMLImageElement>(null);
  const qrImage = useRef<HTMLImageElement>(null);
  const printCleanup = useRef<(() => void) | null>(null);
  const readyNotified = useRef(false);
  const [artworkFallback, setArtworkFallback] = useState(false);
  const snap = b.snapshot;
  const artwork = snap.movie.backdrop || snap.movie.poster;
  const confirmed = b.status === "confirmed";
  const artworkPosition = snap.movie.backdropPosition || "50% 50%";
  // Shallow admission banners need a higher crop than full-height movie heroes.
  const ticketPosition = artworkPosition.replace(/([\d.]+)%$/, (_, y: string) => `${Number(y) * 0.5}%`);

  useEffect(() => {
    let active = true;
    setQr("");
    setQrError(false);
    setArtworkFallback(false);
    readyNotified.current = false;
    if (confirmed) ticketQr(b.token, window.location.origin).then(value => { if (active) setQr(value); })
      .catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [b.token, confirmed, qrAttempt]);
  useEffect(() => {
    if (!onReady || !confirmed || readyNotified.current || (!qr && !qrError)) return;
    let active = true;
    let timeout = 0;
    const artworkReady = artworkImage.current
      ? Promise.race([
          artworkImage.current.decode().then(() => true, () => false),
          new Promise<boolean>(resolve => { timeout = window.setTimeout(() => resolve(false), 1600); }),
        ])
      : Promise.resolve(false);
    const qrReady = qrError || !qrImage.current
      ? Promise.resolve(qrError)
      : qrImage.current.decode().then(() => true, () => false);
    Promise.all([artworkReady, qrReady]).then(([hasArtwork, hasQr]) => {
      if (!active) return;
      window.clearTimeout(timeout);
      if (!hasArtwork || !artworkImage.current?.naturalWidth) setArtworkFallback(true);
      if (!hasQr && !qrError) {
        setQr("");
        setQrError(true);
      }
      readyNotified.current = true;
      onReady();
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [artwork, confirmed, onReady, qr, qrError]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  useEffect(() => () => printCleanup.current?.(), []);

  async function download() {
    setWorking(true);
    try {
      const link = document.createElement("a");
      link.download = `MovieVerse-${b.id}.png`;
      link.href = await ticketImage(b, qr);
      link.click();
    } catch { notify("Ticket download is unavailable. Please try printing your ticket."); }
    finally { setWorking(false); }
  }

  async function print() {
    if (!article.current || !confirmed) return;
    setWorking(true);
    printCleanup.current?.();
    try {
      const printQr = await ticketQr(b.token, window.location.origin);
      const sheet = await prepareTicketPrint(article.current, printQr);
      const cleanup = () => {
        sheet.remove();
        window.removeEventListener("afterprint", cleanup);
        printCleanup.current = null;
      };
      printCleanup.current = cleanup;
      window.addEventListener("afterprint", cleanup);
      window.print();
    } catch { printCleanup.current?.(); notify("Ticket images or QR could not be prepared for printing. Please retry after they finish loading."); }
    finally { setWorking(false); }
  }

  const future = new Date(`${snap.show.date}T${snap.show.time}:00+05:30`).getTime() > Date.now();
  return (
    <article ref={article} className={`digital-ticket ${landscape ? "animation-ticket" : ""} ${b.status === "cancelled" ? "cancelled" : ""}`} data-booking-id={b.id} data-booking-status={b.status}>
      <header className="premium-ticket-header ticket-reveal-header">
        <Logo />
        <span className={`ticket-status ${confirmed ? "" : "cancelled"}`}>
          {confirmed ? <CheckCircle2 size={12} /> : b.status === "cancelled" || b.status === "failed" ? <X size={12} /> : <Clock size={12} />}
          {bookingStatusLabel(b.status)}
        </span>
        <p>YOUR UNIVERSE. YOUR MOVIE. YOUR SEAT.</p>
      </header>
      <div className="premium-ticket-hero" data-artwork-kind={snap.movie.backdrop ? "backdrop" : "poster"} data-artwork-fallback={artworkFallback ? "true" : undefined}>
        <img className="ticket-artwork-fill" src={artwork} alt="" aria-hidden="true" onError={e => { e.currentTarget.style.display = "none"; }} />
        <img ref={artworkImage} className="ticket-artwork-main" src={artwork} alt={`${snap.movie.title} artwork`} decoding="async" fetchPriority="high" style={{ objectPosition: artworkPosition, "--ticket-artwork-position": ticketPosition } as CSSProperties} onError={() => setArtworkFallback(true)} />
        <div><h2>{snap.movie.title}</h2><span>{snap.show.language}</span><span>{snap.show.format}</span></div>
      </div>
      <div className="ticket-perforation" aria-hidden="true" />
      <div className="premium-ticket-body">
        <dl className="premium-ticket-details ticket-reveal-details">
          <div><MapPin /><dt>Cinema</dt><dd>{snap.venue.name}<small className="ticket-address">{snap.venue.address}</small></dd></div>
          <div><Monitor /><dt>Screen</dt><dd>{snap.auditorium}</dd></div>
          <div><Clock /><dt>Show date & time</dt><dd>{bookingDate(snap.show.date + "T12:00:00+05:30")}<small>{snap.show.time} IST</small></dd></div>
          <div><Armchair /><dt>Seats · {b.seats.length} {b.seats.length === 1 ? "ticket" : "tickets"}</dt><dd>{b.seats.join(", ")}</dd></div>
          <div><IndianRupee /><dt>{confirmed ? "Total · simulated payment" : "Booking total"}</dt><dd>{rupees(b.pricing.total)}</dd></div>
          <div className="ticket-booked-date"><CalendarDays /><dt>Booking date</dt><dd>{bookingDate(b.created)}</dd></div>
        </dl>
        <div className="premium-ticket-qr ticket-reveal-qr">
          {confirmed ? <>
            <div className="qr-panel">
              {qr ? <img ref={qrImage} className="qr-code" src={qr} alt={`QR verification for booking ${b.id}`} width={320} height={320} /> : <div className="ticket-qr-placeholder" role="status">{qrError ? "QR unavailable" : "Preparing QR…"}</div>}
              {qr && <span className="ticket-qr-scan" aria-hidden="true" />}
            </div>
            {qrError ? <button className="text-link" onClick={() => setQrAttempt(n => n + 1)}>Retry QR code</button> : <strong>Scan at Entry</strong>}
            <span className="ticket-entry-note">Demo verification only</span>
          </> : <p className="ticket-entry-note">{b.status === "cancelled" ? "This ticket has been cancelled." : "No admission code until your booking is confirmed."}</p>}
          {confirmed && <div className="booking-stamp" aria-label="Booked"><Check size={14} aria-hidden="true" /><span>BOOKED</span></div>}
        </div>
      </div>
      <div className="premium-ticket-footer">
        <div className="premium-booking-id ticket-reveal-details">
          <Ticket aria-hidden="true" /><div><span>BOOKING ID</span><strong>{b.id}</strong></div>
          <button className="icon-btn" aria-label={copied ? "Booking ID copied" : "Copy booking ID"} onClick={async () => {
            try { await navigator.clipboard.writeText(b.id); setCopied(true); }
            catch { notify("Could not copy. Select the booking ID to copy it manually."); }
          }}>{copied ? <Check size={18} /> : <Copy size={18} />}</button><span role="status">{copied ? "Copied!" : ""}</span>
        </div>
        <div className="premium-ticket-disclaimer"><strong>DEMO TICKET · NO REAL CINEMA ADMISSION</strong><p>Simulated payment. No money was charged.</p></div>
        <div className="premium-ticket-actions">
          {confirmed && <>
            <button className="btn btn-gold" onClick={download} disabled={!qr || working}><Download size={15} />Download ticket</button>
            <button className="btn btn-outline" onClick={print} disabled={!qr || working}><Printer size={15} />Print ticket</button>
          </>}
          <Link className="text-link" href={`/my-tickets/${encodeURIComponent(b.id)}`}>View booking</Link>
          {future && confirmed && <button className="cancel-ticket" onClick={onCancel}>Cancel demo booking</button>}
        </div>
      </div>
    </article>
  );
}
