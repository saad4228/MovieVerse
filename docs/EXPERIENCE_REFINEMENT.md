# MovieVerse interaction and motion refinement

Implemented 3 November 2026, following the premium 3D cinema interaction brief and the subsequent authorization to implement the discussed improvements.

## What changed

- Exact seat interaction uses a static chair-shaped hit geometry and stable instance-to-booking-ID mapping. Canvas coordinates are calculated from client coordinates and the canvas bounds. Animated upholstery never changes the pick target.
- A shared gesture tracker rejects drags, including out-and-back drags, right clicks, multi-touch and cancelled gestures. The down/up seat identity must match.
- Hover identifies the exact seat, category, price and current availability. Available seats brighten, lift 0.025 units and gain a restrained gold base highlight. Touch selection does not require hover.
- Selected upholstery lifts 0.065 units over 220ms, with a 180ms colour transition, gold base highlight and animated check/seat label. Supports remain on the floor; selection reverses on deselection. Unavailable seats never receive selection feedback.
- Muted burgundy, slate, plum and bronze finishes have matching category cues. Leather is less glossy. Instanced soft contact shadows use one small shared procedural texture per batch, with no external asset or dependency.
- Swept camera collision checks allow sliding along obstacles instead of cancelling all movement. Zoom is gentler, direct unobstructed preset paths are preferred, and the existing safe elevated route remains the fallback. Preset transitions target 800-1400ms.
- Reset view, Find my seats and Undo selection preserve booking data. Undo rechecks availability and paired recliners. Selection changes are ignored while the hold request is in progress.
- Seat preview preserves actual seat world transforms and restores the prior camera. Orbit/pan/zoom are disabled while inspecting a fixed seated perspective so the seat label cannot describe a camera elsewhere. Exit Preview and other presets remain available.
- Preview displays approximate screen angular span and vertical sightline calculated from the illustrative screen geometry. No subjective seat-quality rating is invented. Custom imported models omit these metrics.
- Lighting dims gently for playback, with a slightly darker seat-preview mood, without adding per-seat lights. Reduced motion skips seat, label and lighting transitions.
- Selected-seat summary rows enter and leave with short fades/slides; totals update with restrained motion while amounts change immediately. On shorter desktop windows the sidebar scrolls its own selection summary into view. Mobile secondary theatre controls are grouped into an accessible toggle; primary controls have 44px targets.
- Movie cards retain their size while posters load or fail, with a readable fallback. Movie lists have brief staggered entrances. Browsing filters persist per listing/city within the tab; returning from details restores listing scroll position. Checkout surfaces have a short entrance transition.

## Files modified in this implementation

Application:
- app/globals.css
- components/BookingFlow.tsx
- components/Home.tsx
- components/Discovery.tsx
- components/MovieVerse.tsx
- components/SeatScene.tsx
- components/auditorium/AuditoriumCamera.tsx
- components/auditorium/SeatRenderer.tsx
- components/auditorium/TheatreLighting.tsx
- lib/auditorium.ts
- lib/camera-config.ts
- lib/seat-gesture.ts (new)
- lib/seat-presentation.ts (new)

Verification:
- tests/seat-gesture.test.ts (new)
- tests/e2e/seat-polish.spec.ts (new)
- tests/e2e/browsing-polish.spec.ts (new)
- tests/e2e/large-screen-seats.spec.ts (mobile overlay/menu checks)
- tests/e2e/journeys.spec.ts (updated an outdated confirmation-heading assertion)
- docs/EXPERIENCE_REFINEMENT.md (this report)

Pre-existing changes in the workspace were retained. No new dependencies, inventory backend changes, payment-provider changes, ticket layout changes, or deployments were introduced.

## Verification

- Full Vitest suite: 73 tests passed.
- TypeScript checks and production build passed. The build retains the existing large-chunk warning and Vinext route-classification notice.
- Main browser regression run: 16 tests passed, covering listing state/scroll, camera boundaries, demo booking failure recovery/success, ticket download/QR/history, city switching, atomic holds/idempotency, mobile flows, playback, presets, exact seat previews, adjacent hover/click, lift, undo, recovery, and touch/reduced motion.
- Additional browser checks: trailer lifecycle/control suppression, mobile preview overlay separation and settings menu, and paused idle rendering passed (4 tests).
- Ticket stamp regression passed: hidden before emergence, stamping afterwards, refresh/replay behavior, and absence on pending/failed records.
- Final targeted seat regression: 2 tests passed after the sidebar update, including a check that clicking a seat leaves the camera position unchanged.
- Screenshots inspected: outputs/seat-polish-desktop.png, outputs/seat-polish-mobile.png, outputs/seat-preview-grand-mobile.png, outputs/seat-preview-luxury-mobile.png, outputs/browse-polish.png.

## Practical limits

- Bookings and payments remain clearly labelled simulations; these changes do not connect licensed cinema inventory or live payments.
- Verification covered all three bundled auditorium layouts. No custom imported auditorium asset was supplied for a separate model-specific collision/hover audit.
- Browser automation uses SwiftShader software rendering. A tour sample measured roughly 1.2 scene FPS under the local automated workload; this is not a hardware GPU benchmark or a 60 FPS claim. A final ordinary-device GPU/mobile performance pass remains advisable.
- Paused scenes stopped continuous rendering: 4 frames over a three-second observation window, including normal state/availability activity. Animation uses the existing demand-driven R3F loop and shared instanced geometry/materials.
- Embedded YouTube lifecycle tests use a controlled fixture; existing source/provider restrictions and overlays are not bypassed. The direct sample-film playback path was exercised separately.
