# Single-screen seat-selection workspace

## Cause and layout change

The old `.seat-layout` combined `height: calc(100svh - 161px)` with a 650px minimum height, beneath the navbar and movie header. This forced the document beyond smaller desktop viewports. Large category cards, full-width Quick Pick fields and section margins also made the sidebar scroll independently.

The seat route now owns a `100dvh` flex shell. The navbar and compact show header keep their natural heights; the remaining space belongs to a grid workspace. No JavaScript measurements or viewport-dependent scene keys are used. This shell applies only to `/booking/:show/seats`.

## Files

- `components/MovieVerse.tsx`: adds the seat-route shell class.
- `components/BookingFlow.tsx`: compact functional category buttons connected to Quick Pick, mobile summary toggle, retained inventory and pricing information, control tooltips, and removal of sidebar auto-scrolling.
- `components/seat-workspace.css`: scoped desktop workspace, compact sidebar, independent selected-seat scrolling, pinned checkout, tablet/mobile summary panel and toolbar spacing.
- `tests/e2e/seat-workspace.spec.ts`: viewport and functional browser coverage.

## Behaviour

- Desktop: all controls and checkout stay within the viewport. Only unusually long selected-seat lists scroll.
- Tablet/mobile at 900px or below: the auditorium retains its size while the summary panel opens above checkout. Closing the panel preserves selection. Short screens can scroll within that panel.
- Category buttons and the preferred-class selector share state; category prices and availability still come from the existing show and inventory.
- The seat summary retains addition/removal motion and totals retain their existing update animation.
- Notifications sit above the theatre toolbar.
- An existing Undo timing bug discovered during verification was corrected: selection history now captures the previous seats before scheduling the React state update.

No auditorium geometry, camera algorithms, booking APIs, price calculation, payment handling or ticket presentation was redesigned. The 3D canvas remains mounted and retains its dimensions while selections or the mobile summary change.

## Verification artifacts

Target desktop checks cover 1920×1080, 1600×900, 1440×900, 1366×768 and 1280×720 with zero, two, four and eight seats, removal and Undo. Additional checks cover category selection, seat preview, 2D selection, the snacks handoff, and summary panels at 768px and 390px.

Screenshots: `outputs/seat-workspace-verified-{width}x{height}.png` and `outputs/seat-workspace-sheet-{width}.png`.

Results: all eight new browser checks passed after correcting two test selectors to match existing UI labels. Both existing movie-first and cinema-first journeys also passed, including simulated payment failure/retry, confirmation, QR display, download and history. All camera presets, seat preview, category selection and the 2D handoff were exercised. TypeScript, 73 unit tests and the production build passed. The build retains its existing large-chunk and route-classification warnings.

Automated rendering uses Chromium software WebGL; these checks verify layout and interaction, not hardware FPS.
