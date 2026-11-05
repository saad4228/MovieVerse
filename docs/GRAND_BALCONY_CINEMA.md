# Grand Balcony Cinema — implementation and verification

Implemented locally on 4 November 2026. The Grand is the flagship **illustrative demo**, not a measured model of an actual cinema. Backend inventory, class definitions, prices, seat IDs, reservation and checkout code were not replaced.

## Reference review

All eleven supplied images were located in Downloads and reviewed together at labelled positions:

| Reference | Applied direction |
| --- | --- |
| 1. seats-3d | Retain the existing screen/seat/booking relationships and sidebar |
| 2. Neon Jailer 2 Theatre Tour | Warm walnut, velvet proscenium, a real stage and guided destinations |
| 3. Neon Theater Seat Selection | Contoured upholstery, headrests, armrests, cup holders and immediate turquoise selection |
| 4. Balcony Seat Booking | Curved upper edge with seating visible on a genuinely elevated deck |
| 5. Cinematic Theater Seat Selection | Visible ceiling coffers and the balcony underside/supports |
| 6. Neon Cinema Seat Selection Interface | Overhead framing that includes the seating blocks and aisles |
| 7. Balcony View | Elevated audience perspective with the railing and lower floor visible |
| 8. Jailer 2 Cinema Seat Booking Interface | Acoustic wall depth, timber bays and stage clearances |
| 9. Jailer 2 Cinematic Cinema Booking UI | Side-angle depth and navigable seating sections |
| 10. Jailer 2 Cinema Seat Booking | A centred projection aperture, red curtains and an illuminated timber apron |
| 11. Cinematic Jailer 2 Seat Booking UI | An opening composition showing screen, lower hall and upper-level separation |

## Audit and playback diagnosis

The existing system already used a persistent native HTMLVideoElement and Three.js VideoTexture for authorised MP4/HLS sources. YouTube used the official IFrame API inside Drei's world-positioned Html overlay. Camera commands did not intentionally reload either media source.

The initial forced-software-renderer reproduction showed the native clock advancing from 5.40s to 52.21s while only about 100 presented frames arrived. The element, source and texture identity remained unchanged. Playback then reached the normal clip ending. This reproduction demonstrated rendering/compositing starvation rather than a camera-triggered source reload or proof of a network outage.

Inspection also found synchronous `drawImage(video)`/`getImageData()` readbacks in the 3D frame loop, many separate static architectural draw calls, and unnecessarily detailed seat parts for software rendering. These are now removed or reduced. This does not establish that every historical report had one identical cause, or guarantee playback on every device/network.

Changes:

- Static non-interactive architecture is merged by compatible material into batches. Seats, live projection, lights and imported models are excluded from this batching component.
- Screen illumination uses a restrained tint without synchronously reading video pixels into a canvas.
- Software/low-memory seat rendering uses shared bevel hulls, simpler cup-holder geometry and standard upholstery materials; capable GPUs retain the detailed seats.
- Camera updates run before the projected YouTube surface's transform update.
- YouTube callbacks live in refs, so callback identity changes cannot recreate the player. Supported provider controls and branding behaviour remain intact.
- Native decoder/presentation telemetry runs separately from R3F. `requestVideoFrameCallback` measures actual presented frames, while texture upload versions and renderer frames measure the 3D side independently.
- The public application does not inspect or capture cross-origin YouTube video frames. The opt-in browser test inspects frame counters through Playwright solely for verification.

Useful development canvas attributes: `data-media-telemetry`, `data-render-telemetry`, `data-video-texture-id`, `data-youtube-instance`, `data-camera-position`, `data-camera-fov`. Telemetry contains no media URLs or credentials.

## Architecture and interaction

- Grand's default row arc is 1.15m at the room sides; explicit configured curvature wins. Imported models do not receive this default. Seat identities, category, accessibility, couple grouping and blocked attributes remain identical to the straight configuration.
- Curved carpeted platforms follow those same row arcs. The 2D and 3D views receive the same generated seat records.
- Balcony floor, thin upper tiers, curved walnut fascia, bronze handrail, underside beams, support columns and amber edge lights are actual geometry. They use the existing upper-level bookable rows.
- Side access flights use risers no taller than approximately 18cm for the balcony rise, with longer treads; rail ends leave side access open.
- A curved wooden stage apron, gold perimeter, velvet curtains and fluted timber proscenium frame the existing proportional projection surface. No movie source is hardcoded into the screen.
- Walnut bays alternate with charcoal/burgundy acoustic panels. Warm front fill and integrated aisle nosings improve depth without extra shadow-casting lights or post-processing dependencies.
- Hover colour response is approximately 140ms and physical lift 160ms, with stable, separate hit proxies. Occupied chairs do not lift into a selectable state.
- Balcony camera sits 1.65m above the actual upper deck, just behind its front rail. Bird's Eye uses a separate elevated rear viewpoint and wider lens to include the upper and lower seats.
- Free View retains its current lens. Seat preview saves/restores the lens as well as position and target, avoiding a surprise zoom when clicking or exiting preview.
- Wheel dolly is eased and respects existing collision/boundary checks. A blocked dolly stops scheduling attempts against a wall.
- Tour offers actual modelled stage, hall, balcony and premium-seat destinations, with small geometry-derived locator thumbnails. There is no invented entrance/lobby.
- Grand appears in a checked-availability flagship recommendation and wins equal-showtime listing ties. Explicit price/show-count sorting and other venue layouts remain available. No existing screening is reassigned to a different room.
- Mobile presets have enough width for the Balcony/Tour labels, with tour stops horizontally scrollable. The booking sidebar is retained.

Existing custom cinema names and saved screening snapshots are retained. Newly bundled Grand configurations use the name `Grand Balcony Cinema · Screen 1`. Compact/recliner rooms are not forced into balcony layouts; balcony geometry is reusable for any appropriately configured illustrative room.

## Verification

Passed:

- 111 unit tests, including curved-floor alignment, unchanged booking attributes, real balcony clearance, railing collision and every seat's preview-eye clearance.
- TypeScript typecheck.
- Production build (existing large-chunk warning remains).
- Grand browser test: real upper-level selection in 2D, actual 3D chair raycast selection, seated preview, exit/selection persistence, Balcony/Bird's Eye/Tour, mobile controls and continuing to snacks.
- Native 30-second continuous orbit, repeated dolly, preset changes and seat selection: same element and texture; advancing clock, presented frames and GPU uploads. The final hardware run averaged approximately 51 FPS; clock 0.458s → 30.458s, 707 additional presented frames.
- Separate real live YouTube test: clock 0.038s → 30.018s, 718 additional presented frames, one player and one iframe media element, playing state throughout all sampled points. Browser screenshots were recorded during movement. No fixture was used for this test.
- MP4 and HLS buffering/last-texture retention, mute/pause/replay and disposal.
- Official YouTube API fixture: readiness, buffering, replay/error/retry and fullscreen lifecycle.
- Existing screen non-selection, occupied-seat protection and 2D/3D synchronization test.
- Existing category/quick-pick/preview/snacks-to-checkout regression.
- Full Nagpur journey: snacks, simulated payment failure and recovery, confirmed booking, QR, download, history and cancellation.

Hardware checks used local hardware-accelerated Chromium on a machine with RTX 4050 / Intel UHD graphics. Software-renderer playback remains substantially slower; these measurements are not a universal FPS guarantee. YouTube retains normal provider-owned overlays and external network/embedding constraints.

### Reproduce

With the local dev server running:

```powershell
npm run typecheck
npm test
npm run build
npx playwright test tests/e2e/grand-balcony.spec.ts --config playwright.hardware.config.ts
$env:MOVIEVERSE_LIVE_YOUTUBE='1'
npx playwright test tests/e2e/grand-youtube-live.spec.ts --config playwright.hardware.config.ts
```

The live test is opt-in; the normal suite does not depend on YouTube availability. Default Playwright configuration continues to use SwiftShader. Screenshots are in `outputs/grand-cinema/`; live motion samples/screenshots are in `outputs/grand-live-youtube-motion.json` and `outputs/grand-youtube-motion-*.png`. The native test writes its measurements to `test-results/grand-playback-motion.json` and `test-results/grand-playback-controls.json`.

## Files changed in this task

Architecture/UI:

- `components/SeatScene.tsx`
- `components/AuditoriumDetails.tsx`
- `components/BookingFlow.tsx`
- `components/MovieShowtimes.tsx`
- `components/seat-workspace.css`
- `components/auditorium/BalconyArchitecture.tsx` (new)
- `components/auditorium/GrandStage.tsx` (new)
- `components/auditorium/RowPlatforms.tsx` (new)
- `components/auditorium/StaticArchitecture.tsx` (new)
- `components/auditorium/AuditoriumCamera.tsx`
- `components/auditorium/SeatRenderer.tsx`
- `components/auditorium/TheatreLighting.tsx`

Playback/layout helpers:

- `components/auditorium/CinemaScreen.tsx`
- `components/auditorium/EmbeddedCinemaTrailer.tsx`
- `lib/auditorium.ts`
- `lib/catalog.ts`
- `lib/balcony.ts` (new)
- `lib/seat-layout.ts` (new)
- `lib/video/telemetry.ts` (new)
- `lib/video/youtube-api.ts`

Verification:

- `tests/grand-balcony.test.ts` (new)
- `tests/e2e/grand-balcony.spec.ts` (new)
- `tests/e2e/grand-youtube-live.spec.ts` (new)
- `playwright.hardware.config.ts` (new)
- This report.

No new assets, dependencies, credentials, database migrations, payment integration or deployment were introduced.

Technical references: [Three.js VideoTexture](https://threejs.org/docs/pages/VideoTexture.html), [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls), [official YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).
