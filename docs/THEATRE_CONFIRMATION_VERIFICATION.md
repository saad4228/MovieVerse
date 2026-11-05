# Theatre and compact confirmation verification — 3 November 2026

## Implemented

- Cinema screen surfaces explicitly opt out of raycasting. Seat interactions use one simple instanced hit box per seat instead of raycasting every detailed cushion, armrest and stitching mesh. Availability checks reject unknown IDs, blocked/booked seats and other users' holds before invoking selection, including custom model selections.
- Memoized room and seat grouping; stable hit-area matrix setup; separate geometry/material disposal and cursor cleanup. Existing instancing, seat colours, lighting, controls and shared selection state remain.
- Demand rendering uses camera invalidation and decoded video callbacks. Loading/buffering no longer forces a continuous render loop.
- Software renderers and devices reporting less than 4 GB memory use lower seat tessellation while retaining the seat parts, upholstery and materials. Hardware desktop geometry remains unchanged.
- Confirmation uses the reusable DigitalTicket with a confirmation-only landscape class: 880 × 368.1 px for the tested booking. Header, cinematic banner, horizontal information grid, QR admission area, booking ID/copy, disclaimer and existing actions remain populated from the saved booking.
- Printer height is 104 px on desktop. Reserved output track clips a fully rendered sheet translated through the slot, with brief feed pauses and a cutter action. Ready/preparation/feed sequence is approximately 3.49 seconds after assets are ready. Navbar remains separate; confirmation entry animation no longer restarts on completion.
- Natural scrolling remains on smaller screens and for unusually large content. No global page scaling or overflow clipping of desktop content. Print media and downloaded-image layouts remain separate.

## Functional and layout results

All passed:

- `tests/e2e/compact-confirmation.spec.ts`: real demo checkout, correct saved booking data, 1920×1080 / 1440×900 / 1366×768 / 1280×720, reserved stage fits throughout feed, final document has no vertical overflow, QR visible, download and actual PDF generation, no page errors.
- `tests/e2e/ticket-experience.spec.ts`: five tests covering checkout failure/success, replay/refresh without duplicate bookings, export, mobile widths, Escape, reduced motion, pending/failed/cancelled records, loading/error/retry.
- `tests/e2e/theatre-interaction.spec.ts`: screen click/hover does not change selection or show seat cursor; available seat selected in 2D and deselected through its projected 3D position; 2D state synchronized; unavailable seat disabled; no page errors. Tested the built-in Pune auditorium, not every custom imported model.
- `tests/e2e/theatre-performance.spec.ts`: measured scene frame counters and browser frame callbacks; idle draw check.
- `npm run typecheck`.
- `python scripts/verify-ticket-pdf.py`: actual one-page PDF and PNG QR decode to saved booking URL; PDF booking ID and demo label present.
- Independent OpenCV QR decoding succeeded on full final screenshots at all four viewport sizes.

Screenshots: `outputs/compact-{1920,1440,1366,1280}-{begin,middle,end,complete}.png` (16 files).
Exports: `outputs/cinematic-ticket-print.pdf`, `outputs/cinematic-ticket-download.png`.

## Measurements and limits

Chromium headless, SwiftShader software WebGL, local development server. No hardware-accelerated desktop was available for verification.

Controlled seat-renderer comparison used the original tracked SeatRenderer temporarily, then restored the optimized component. The surrounding current camera/runtime was the same; this is not a baseline of the entire old application. Short samples have substantial variance and are not a general hardware benchmark.

| Measurement | Original seat renderer | Optimized seat renderer |
| --- | ---: | ---: |
| Scene frames/sec, renderer frame counter | 0.645 | 1.951 |
| Browser RAF frames/sec during tour | 0.651 | 1.976 |
| Rendered triangles/frame | 2,630,490 | 544,602 |
| Draw calls/frame | 337 | 337 |

Triangle work fell about 79%. Low-detail geometry improves the software path; **the theatre does not meet 60 FPS in this environment**. Stable 60 FPS on capable desktop hardware remains unverified. No claim that all camera transitions are now stutter-free.

Paused theatre: 3 scene draws over 3 seconds after settling, versus a continuous frame loop. Sparse invalidations can still arise from inventory/media updates.

Ticket replay: 60.03 browser RAF frames/sec over 3.5 seconds; 95th percentile frame interval 16.7 ms. This measures browser callback cadence during the real CSS animation, not a GPU presentation trace. Raw results are in `outputs/theatre-before.json`, `outputs/theatre-after.json`, and `outputs/ticket-animation-performance.json`.

Cleanup reviewed for geometry/material disposal, timers, listeners and cursor state. No long-duration heap profiling was performed; absence of all memory leaks is not established.

## Files changed for this task

- `components/SeatScene.tsx`
- `components/auditorium/CinemaScreen.tsx`
- `components/auditorium/SeatRenderer.tsx`
- `components/CinematicTicketExperience.tsx`
- `components/DigitalTicket.tsx`
- `app/ticket-experience.css`
- `tests/e2e/ticket-experience.spec.ts`
- `tests/e2e/compact-confirmation.spec.ts`
- `tests/e2e/theatre-interaction.spec.ts`
- `tests/e2e/theatre-performance.spec.ts`
- This report.

All bookings remain explicitly simulated. No provider integration, credentials, movie catalogue, navbar styles, or ticket export rendering was redesigned in this task.
Production build: `npm run build` passed. Existing warnings remain for large client chunks and Vinext route classification; neither blocked the build.
