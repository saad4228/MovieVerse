# Cinematic booking confirmation

This feature uses the existing React/Vinext frontend, CSS, `qrcode`, canvas PNG export, and D1 booking snapshots. No dependency, API or database schema changes are required. MovieVerse still uses simulated payments and demo admission; the animation does not imply a live cinema integration.

## Data and navigation

`BookingFlow.tsx` marks the ID only after `bookingProvider.checkout` resolves successfully. `lib/ticket-experience.ts` holds that one-use cue in module memory. `Account.tsx` fetches the session's bookings, consumes the cue and checks the saved status before mounting the experience. Refreshing starts with no cue; the backend retrieves the original booking. No URL flag, local-storage booking or timer can confirm a booking. Replay is presentation state only and issues no checkout or payment request. Existing atomic holds, pricing, payment simulation, ownership and idempotency are unchanged.

Loading, unavailable and missing records use the existing loading/error/empty interfaces. Confirmed wording is withheld until the record is loaded. Pending/unknown statuses show awaiting confirmation, failed records show failure, and cancelled records show cancellation; none offer an admission QR, stamp, download or print.

## Animation

`CinematicTicketExperience.tsx` manages start/completion, replay, Escape/skip, focus and cleanup. A single 3300ms timer ends a run; CSS owns the intermediate sequence. The clipping idea follows the local ParkWise receipt implementation, adapted to the existing MovieVerse digital ticket.

| Time | Presentation |
| --- | --- |
| 0–400ms | Dim overlay, confirmation heading, active orange slot lighting |
| 400–800ms | Subpixel motor movement and restrained light sweep |
| 800–1800ms | Paper translates from entirely above a fixed overflow-hidden track; perspective and scale vary subtly |
| 1800–2400ms | Staggered branding, artwork, booking information, then actual QR and brief scan line |
| 2400–2900ms | BOOKED stamp lands at 1.5× scale, overshoots and settles in its own QR-column space |
| 2900–3300ms | Dispenser lighting recedes; the temporary overlay is removed and full ticket/actions remain |

The feed uses transform/opacity, with no layout animation or per-frame React state. The track aligns directly with the slot and reserves paper space from the start. The final ticket uses the existing responsive design; the mobile animation uses a compact layout rather than scaling the entire desktop interface. The overlay can scroll on short screens.

Reduced-motion preference skips the sequence, including on explicit replay, and changes to that preference during playback finish immediately. During playback, surrounding branches and the emerging ticket are inert, focus remains on Skip animation, and Escape finishes. Completion restores background interaction and focuses Replay without scrolling. Timers, media listeners, keyboard listeners, inert flags and scroll locking are restored on cleanup. A live status announces confirmation and completion.

## Ticket actions

`DigitalTicket.tsx` is extracted from Account's existing ticket. It preserves snapshot artwork, original ID, exact seats, price and show data, adds booking date/ticket count and uses the real opaque verification token. QR generation uses a four-module quiet zone and error correction M. QR failure offers a retry; exports remain disabled until a QR exists.

PNG export remains in `lib/ticket-image.ts`, now including the ticket count, booking date, simulated-payment label and BOOKED stamp. Printing clones only the selected ticket into a temporary print sheet, waits for its images, and hides the surrounding application in print media. After-print and unmount cleanup remove that sheet. View booking links to `/my-tickets/:id`.

## Verification

`tests/e2e/ticket-experience.spec.ts` uses actual local-backend bookings for checkout, failure recovery, snapshot accuracy, refresh/replay idempotency, download, print, mobile layout, keyboard behavior and reduced motion. It freezes the replay clock and seeks the real CSS animations to verify that the paper starts fully inside the slot and is partially exposed during feeding. Status and outage simulations reuse a backend-created snapshot; they are not production sample data. The existing `ticket-design.spec.ts` and booking journey tests cover artwork, clipboard, history, cancellation and backend atomic checkout.

All five cinematic-ticket tests plus the two existing ticket-design tests passed. The existing Nagpur movie-first booking journey also passed, and the independent two-session test confirmed atomic holds and idempotent checkout. `npm run typecheck`, all 46 Vitest tests and `npm run build` passed. Browser artifacts are written under ignored `outputs/`: completed desktop/mobile tickets, dispenser and feeding/stamped screenshots, exported PNG, the expected QR reference and a one-page print PDF. OpenCV decoded the downloaded PNG QR and verified that it contains the matching saved booking URL. The print test intercepts the browser print dialog and inspects print media/PDF; operating-system printer hardware is not part of browser automation. Frame-rate assertions are not imposed on software-rendered headless browsers.

## Changed files for this feature

| File | Change |
| --- | --- |
| `components/BookingFlow.tsx` | Mark successful checkout navigation for the one-time entrance. |
| `components/Account.tsx` | Load and gate confirmation by saved status; extract the existing ticket; accurate verification wording for non-confirmed states. |
| `components/CinematicTicketExperience.tsx` | Dispenser presentation, replay, accessibility, lifecycle and completion. |
| `components/DigitalTicket.tsx` | Shared saved ticket, real QR, retry, copy, download, print and details navigation. |
| `lib/ticket-experience.ts` | Ephemeral arrival cue and explicit booking-status labels. |
| `lib/ticket-image.ts` | Guard confirmed exports; add stamp, count, booking date and payment wording. |
| `app/ticket-experience.css` | Feed masking, timed motion, responsive layout, reduced motion and isolated print styling. |
| `app/layout.tsx` | Load the feature stylesheet. |
| `app/globals.css` | Fit the existing navigation logo within a 320px viewport. |
| `tests/e2e/ticket-experience.spec.ts` | Actual-backend and simulated-status browser regression coverage. |
| `docs/BOOKING_FLOW.md` | Document the updated confirmation/action flow. |
| `docs/CINEMATIC_TICKETS.md` | Implementation, accessibility, test coverage and file inventory. |

Other dirty files and concurrent dependency edits in the shared checkout are separate from this feature.
