# MovieVerse debugging and improvement report

Reviewed 3 November 2026. Work is local, in the existing checkout. Existing changes and local D1 data were retained; Vite was updated for the HMR fix documented below. No deployment was made.

## Findings and changes

| Area | Finding | Change |
| --- | --- | --- |
| Discovery | Navigation searched only `cityMovies`, which excludes films without active local listings. The movie grid used the same restricted collection. Previously verified external evidence also expires, correctly removing its availability claim. | Search uses the whole catalogue and normalized title, alias and credit matching. The grid has explicit availability filters. A homepage section exposes released films without local listings. Current city availability remains separate from release status. |
| Availability | Missing release metadata could hide an explicitly configured screening. | Explicit eligible screenings remain discoverable even when release metadata is incomplete. Expired external listings remain excluded; no new real-world screenings were invented. |
| Cast | District imports retained `cast_name` but omitted `cast_image`. Some records have no character credit. District IDs and TMDB IDs are separate namespaces. | Restored 94 portrait references across the 13 imported titles. Added a repeatable refresh script. Normalize and deduplicate people, preserve sourced movie-specific roles, and provide portrait fallbacks. Unknown roles use “Character not listed.” |
| Metadata refresh | Temporary provider failures could leave stale fallbacks cached too long; an incomplete response could erase useful local credits. | Merge matching movie/person records, retain primary credits, use alternate sourced portraits, preserve release information when absent from a provider response, retry failed provider fetches after one minute. Successful server metadata cache remains 24 hours; browser cache is five minutes. |
| Embedded player lifecycle | Drei Html's default destination follows the R3F event connection, which changes during setup and can recreate a separate DOM root. | Give the player a stable Canvas-owned portal destination. The provider exclusively owns the iframe inside an otherwise empty host; timers, listeners and player resources are disposed on cleanup. No global DOM monkey patches or exception suppression. |
| Runtime diagnostics | The auditorium error boundary switched to the accessible map without reporting the component stack. | Log the actual error and component stack while preserving the existing map fallback. Added repeated mount/interruption regression coverage. The exact reported `removeChild` exception has not been independently reproduced. |
| Camera | Wheel zoom used a sensitivity of 1.1. Idle frames also performed a swept collision check with no movement. | Zoom speed is 3.2. Existing min/max distance and swept collision protection remain. Skip empty collision sweeps. Camera commands are exposed in diagnostic data attributes. |
| Rendering | Static rooms continued requesting renders. Software GPUs incurred the initial HD shadow cost before the adaptive controller reacted. | Demand rendering for inactive scenes; invalidate for camera/light changes and decoder video frames. Start detected software renderers at a reduced resolution with shadows disabled. Hardware HD retains its existing settings. |
| Development performance | Browser traces showed repeated CSS hot updates without authored source changes, including while generated test artifacts were changing. | Restrict Tailwind source scanning to application folders and exclude generated output/runtime folders from Vite watching. |
| Vite HMR error forwarding | When the HMR socket disconnected during an unhandled browser error, Vite's automatic console forwarder tried to report that error over the disconnected socket. Its rejected `send()` was itself observed as another unhandled rejection, recursively producing `send was called before connect` and obscuring the original error. | Updated Vite from 8.0.13 to 8.0.14, whose client handles this specific disconnected-send error in its forwarding hooks. HMR host, port, transport and overlay configuration remain enabled and unchanged. Added a regression test for socket disconnects and CSS hot updates. |
| Branding | The old ticket glyph and text were shared through Logo; browser icons also used the old branding. | Use supplied MovieVerse artwork through the shared component, homepage, PNG export and favicon/app icons, preserving proportions. |
| Ticket | The old landscape stub omitted the full booking ID and copy action; PNG branding and layout differed. | Portrait charcoal/plum ticket with warm/purple lighting, border, perforation/cutouts, actual artwork, dynamic status, details, QR panel, full ID/copy feedback and explicit demo disclaimer. Mobile stacks the QR panel. Canvas PNG uses the same immutable booking snapshot and token QR. |

## Main files

- `components/Account.tsx`, `components/ui.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/ticket-image.ts`: branding and tickets.
- `components/Home.tsx`, `components/Discovery.tsx`, `components/Navigation.tsx`, `lib/movie-discovery.ts`: catalogue discovery and availability labels.
- `components/MovieInformation.tsx`, `lib/movie-information.ts`, `lib/metadata-provider.ts`, `data/discovery-movies.json`, `scripts/refresh-discovery-portraits.py`: cast metadata and portraits.
- `components/SeatScene.tsx`, `components/BookingFlow.tsx`, `components/auditorium/{AuditoriumCamera,CinemaScreen,EmbeddedCinemaTrailer,TheatreLighting,QualityController}.tsx`, `lib/camera-config.ts`: lifecycle, rendering and controls.
- `app/api/[action]/route.ts`: metadata cache headers and artwork in new immutable booking snapshots. Existing booking records retain poster fallback.
- `vite.config.ts`, `.gitignore`: exclude generated artifacts from development watching.
- `package.json`, `package-lock.json`, `tests/e2e/hmr.spec.ts`: Vite HMR fix and regression coverage.
- `tests/audit.test.ts`, `tests/e2e/{audit,ticket-design,journeys}.spec.ts`: targeted coverage, including real booking-token verification before and after cancellation.

## Data and integration boundaries

No database migration or fabricated city inventory was introduced. Optional `TMDB_READ_TOKEN` and an authorised live showtime feed remain external dependencies. A public movie release does not establish a screening in a particular city. Previously expired partner evidence was not extended without verification.

Portrait source records are the existing District movie pages. Drishyam character credits were checked against [Rotten Tomatoes](https://www.rottentomatoes.com/m/drishyam_the_conclusion). Unknown Udta Teer character details remain subject to the configured metadata provider. Tailwind source configuration follows its [official source detection documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files).

## Verification

HMR verification on 3 November 2026: all 3 focused browser checks passed. They confirm clean HMR connections on `localhost` and `127.0.0.1`, a disconnected socket no longer creates a forwarding-error cascade when an unhandled rejection occurs, and CSS hot updates still work. A pre-fix reproduction showed the injected original rejection followed by repeated `send was called before connect` errors. Clean homepage and movie routes had no browser page errors. The user-provided browser session was not directly inspectable, so its precise original application exception cannot be identified from this run.

The combined checkout also passed `npm run typecheck`, all 46 unit tests, and `npm run build` after the HMR dependency update. The build retains the existing large-client-chunk warning. The application responds with HTTP 200 at `http://127.0.0.1:5173/`.

The current combined checkout passes TypeScript, all 46 unit tests and a production build. The focused HMR browser checks also pass. The larger browser suite remains incomplete; see the remaining verification notes.

The earlier broad browser run passed 18 of 19 checks, covering booking/payment recovery, cancellation, accounts, city switching, carousel drag/autoplay, metadata, date changes and commercial player fallback. The remaining sample-film camera test and a new repeated-mount test subsequently encountered severe rendering delays. These failures were retained and investigated; no assertions were removed.

Dedicated ticket/browser checks passed on 3 November 2026. The seven ticket-design and cinematic ticket scenarios pass, including real D1 booking creation, failed payment recovery, saved snapshot accuracy, genuine verification QR, PNG export, one-page print output, pending/failed/cancelled status, service errors and retry, mobile sizing, keyboard controls, reduced motion, refresh and replay without duplicate booking. The existing Nagpur movie-first journey passes end to end with the new confirmation screen, as does the atomic/idempotent two-session checkout check. OpenCV independently decoded the downloaded PNG QR and matched its value to the same saved booking's verification URL. The print browser test generated a single-page A4 PDF. Captures and export are in ignored `outputs/cinematic-*` files.

The idle-room check measured **one animation frame in 1.2 seconds**, and its bounded wheel-zoom assertion passed. There is no controlled baseline FPS measurement, so no FPS percentage improvement is claimed.

Initial ESLint run: **76 errors, 74 warnings**. Subsequent run: **66 errors, 78 warnings**. Existing strict hook-purity, state-in-effect and explicit-any violations remain across the application. Lint is not reported as passing. The production build also retains its existing large-client-chunk warning.

## Remaining verification

The full repository-wide end-to-end suite remains incomplete because of the separate auditorium WebGL test described below. The focused cinematic-ticket suite and booking journey have since passed against an isolated local preview; the earlier preview interruption did not leave ticket checks outstanding.

The real booking-token check did pass before the conflicting run: a confirmed token verifies, an invalid token returns 404, and cancellation changes the same token's verification status to cancelled. Earlier repeated-mount failures included an incorrect assumption that a seat-facing camera view must show the screen; the test now explicitly restores Overview before checking visibility, retaining all three interrupted mount cycles and console-error assertions. Its corrected final run still needs isolated execution.

An isolated rerun of the theatre interruption test timed out after 3.2 minutes while clicking the visible “2D map” control after a viewpoint change. It did not report the earlier `removeChild` exception, but the test did not complete; that separate WebGL interaction/lifecycle concern remains unverified. The successful HMR test is isolated at `tests/e2e/hmr.spec.ts` and does not claim to resolve other browser runtime errors.

The supplied ticket-design image was not attached to this request; the implementation follows the detailed written ticket specification. The last complete typecheck, 46-test unit suite and production build all pass. The build retains its existing large-client-chunk warning. Known ESLint violations and the lack of an authorised live cinema feed remain explicit limits. The exact screenshot `removeChild` exception was not reproduced, so a definitive crash-resolution claim remains unverified.
