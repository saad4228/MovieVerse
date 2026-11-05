# Auditorium navigation and player fixes

## Causes and changes

1. OrbitControls mutates the camera during browser input events, before the render-loop collision check. The old check captured that already-moved position as its safe origin, allowing tunnelling. The controller now retains the last validated position across frames and sweeps from that position. Row-relative clearance is 1.15m; seat base, cushion, arm and back proxies include a 0.18m safety margin. No scene-wide mesh raycasts or physics dependency were added.
2. The front clamp was screen-relative (screen Z + 2.4m), making a large invisible barrier. It now uses the actual auditorium envelope with wall clearance. The projection surface is not a collision object. Vertical orbit remains available with a less extreme polar limit.
3. The screen meshes already ignored selection raycasts, but the embedded iframe was interactive. It now ignores pointer input and keyboard focus. Standard controls and fullscreen are disabled with supported YouTube URL parameters. MovieVerse continues controlling playback through the player API.
4. Browser drag selection could highlight scene content gold. Scene pointer-down now suppresses default text selection without disabling orbit or seat clicks.

## Files modified

- lib/auditorium.ts
- components/auditorium/AuditoriumCamera.tsx
- components/auditorium/EmbeddedCinemaTrailer.tsx
- components/SeatScene.tsx
- lib/video/sources.ts
- tests/auditorium.test.ts
- tests/e2e/camera-boundaries.spec.ts (new)
- tests/e2e/audit.spec.ts
- this report

## Verification

- 17 unit tests: room boundaries, elevated floors, seats, transition routes, screen dimensions and embed URL parameters.
- Browser coverage: aggressive orbit/pan/zoom, returning to Overview, screen click/hover, unavailable seats, 2D/3D selection synchronization, three auditorium seat-preview layouts, camera restoration and embedded-player lifecycle/play/pause.
- Actual live trailers inspected: Jailer 2 played; Coolie initially reported autoplay blocked, then played after an explicit Play click (time advanced to 4.09s). Both used controls=0, fs=0, disablekb=1 and the remaining required parameters.
- Typecheck and production build passed; the build retains its existing large-chunk warning.

## Limits

YouTube can retain provider-owned branding and overlays; no cross-origin CSS injection or unsupported branding removal is used. Autoplay remains browser/provider-dependent, with the existing Play control available. Collision proxies cover the procedural auditorium and blueprint seats; arbitrary imported model geometry has not been certified. Browser tests use software rendering, not a hardware FPS benchmark.

Parameter reference: https://developers.google.com/youtube/player_parameters
