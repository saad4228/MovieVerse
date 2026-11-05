# Code-quality audit and interview guide

Reviewed 5 November 2026 in the existing MovieVerse checkout. This pass targets correctness and readability while retaining the existing product. CSS, visual assets used by the website, database schemas/migrations, deployment settings, seat geometry, pricing rules, and provider contracts were preserved. The two new images under `docs/screenshots/` are documentation captures.

## Bugs fixed

| Area | Finding | Correction and evidence |
| --- | --- | --- |
| Seat holds | Two requests from the same browser session could interleave the new hold and old-selection release, leaving neither selection held. | Both writes now share one D1 batch transaction. Release is conditional on the full new selection being held. Real API tests cover competing selections and a failed replacement preserving the original hold. |
| Checkout | Hold creation rejected a screening that had started; checkout did not repeat that check. | The shared `screeningStarted` check now runs at checkout as well. Boundary tests cover just before, exactly at, and after the start time. Idempotent retries still return an existing booking first. |
| Request parsing | Most JSON routes trusted only `Content-Length`, which can be absent. | `readRequestJson` counts actual streamed bytes. It covers ordinary API bodies, catalogue administration, Watchlist changes, and profile uploads. Unit tests cover byte limits and Unicode; real API tests cover malformed and oversized input. |
| Error responses | Unexpected exceptions could expose database/parser error text and were all returned as HTTP 400. | Expected `RequestError` and validation failures retain safe client messages; unexpected errors return a generic HTTP 500 response. Secrets and internal database details are not included. |
| Catalogue lease | A failed initial sync-run insert occurred before the `try/finally`, leaving the sync lock behind. | The insert now occurs inside the lease's cleanup scope. A SQLite trigger reproduces the failure and verifies lock removal. |
| Concurrent imports | `Promise.all` could reject while sibling detail fetches were still writing, allowing the sync lease to be released too early. | Each bounded batch uses `allSettled`; the first failure is propagated after every started request finishes. A delayed-provider test checks that the lease stays held until completion. |
| Catalogue publication | Updating the active collection pointer and pruning old memberships were separate writes. A pruning failure could be reported as a failed refresh after the new snapshot was already live. | Pointer update and pruning now commit or roll back together. A failing-delete trigger verifies the previous generation remains active. |
| Session bootstrap | A failed request from before an authentication change could clear a newer cached session request. | The failure handler clears only its own promise. A regression test reproduces the invalidation/request race. |
| Ticket verification | A response for a previous token could arrive after a new token was selected and replace its result. | Results are keyed to the token, and effect cleanup ignores superseded responses. Verification data now has an explicit type. |
| Movie artwork and metadata | Local fallback/image state could be reused across movie identities; a failed responsive image could keep selecting its broken `srcset`. | Metadata results are keyed to movie identity, the backdrop's local state resets per movie, and a failed image clears the obsolete `srcset` before trying its fallback. |
| Authentication UI | Overlapping session reads could let an older result replace the latest navbar user. Account reads could also complete after unmount. | The navbar checks request order and mounted state; account/profile reads ignore unmounted results. |
| Hosted media | A pending `play()` could resolve after pause, deactivation, or tab hiding and mark the controller as playing. Visibility recovery also armed a startup timeout for an already decoded video. | Playback completion checks current intent. The recovery watchdog is armed only while decoded data is unavailable. Existing playback/browser tests remain in place. |
| Discovery navigation | Genre return links and several homepage collection links still targeted `/movies`, where those global filters no longer exist. | Links now open the matching Explore collection or its genre anchor. Existing labels, card markup, and visual styling are unchanged. |

## Cleanup and simplification

- Extracted `BookingRecord` into `lib/booking-record.ts`. Ticket rendering and export modules no longer import their domain type from the Account UI module; the Account type export remains compatible with existing test imports.
- Reused the same physical-seat validation for holds and checkout, including duplicate IDs, blocked seats, and complete recliner pairs.
- Reused one bounded JSON reader instead of maintaining a separate streaming parser for profile photos.
- Typed session, inventory, verification, and checkout responses. The general API helper defaults to `unknown`, requiring callers to state the response they use.
- Corrected the catalogue editor's misleading `kind as "Cities"` assertion, so TypeScript can check all four actual record categories.
- Moved the still-used TMDB attribution into `TmdbAttribution.tsx`; removed the unreferenced old discovery-panel implementation after checking all imports and route entry points.
- Replaced render-time ref mutation in the authentication poster snapshot with guarded state. The first loaded poster selection remains stable.
- Made checkout's idempotency UUID a lazy state initializer instead of generating and discarding another UUID on each render.
- Expanded compressed catalogue, provider, Watchlist, and request code into standard formatting for tracing and review. This is a readability change, not a new layer of abstraction.
- Removed avoidable `any` annotations in the production API client/editor/provider path and in the SQLite test helper. Replaced unchanged local `let` declarations with `const` and escaped JSX apostrophes without changing rendered text.

No package was removed based only on a text search. Vendored UI modules, build helpers, optional providers, and dynamically loaded components can depend on packages outside the main page imports. Removing them requires a separate dependency/reachability check.

## Main files

| Files | Responsibility |
| --- | --- |
| `app/api/[action]/route.ts`, `lib/booking.ts`, `lib/request-json.ts`, `lib/profile-photo.ts` | API validation, atomic holds, checkout eligibility, safe request parsing. |
| `lib/catalogue-sync.ts`, `lib/catalogue-api.ts` | Sync lifecycle, request draining, atomic collection publication. |
| `lib/client.ts`, `lib/providers.ts`, `lib/booking-record.ts` | Explicit client/domain types and safe session bootstrap. |
| `components/Account.tsx`, `Navigation.tsx`, `CatalogEditor.tsx`, `AuthPosterCollage.tsx`, `CheckoutExperience.tsx` | Async lifecycle guards, typed data, stable initialization. |
| `components/MovieInformation.tsx`, `components/video/useMoviePlayback.ts` | Movie identity/fallback handling and playback lifecycle. |
| `components/Home.tsx`, `PosterWall.tsx`, `GenreDiscovery.tsx`, `TmdbAttribution.tsx` | Correct discovery destinations and removal of obsolete discovery UI. |
| `tests/client.test.ts`, `request-json.test.ts`, `booking.test.ts`, `dynamic-catalogue.test.ts`, `tests/e2e/cleanup-regressions.spec.ts` | Regression coverage for the corrected behaviours. |
| Existing affected Playwright specs | Updated stale route labels, query-string URL checks, dynamic-catalogue expectations, and seat-preview assumptions. Assertions still verify actual functionality. |
| `README.md`, `docs/screenshots/` | Product/architecture/setup guide and genuine app captures. |

## Verification and remaining issues

Historical reports under `docs/` describe their own checkpoints and should not be read as current suite status.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm test` | Passed: 23 files, 149 tests. Baseline: 21 files, 138 tests. |
| `npm run build` | Passed; existing large-chunk and Vinext route-classification/plugin-timing warnings remain. |
| `npm run lint` | 160 errors and 71 warnings; baseline was 190 errors and 73 warnings. Not clean. |
| Broad Playwright run | 131 tests: 99 passed, 31 failed, one skipped. This run began before the targeted browser-fixture corrections. |
| Focused browser rerun | 36 tests: 31 passed, five failed. The new API/hold/request/discovery regressions passed. |
| Later focused checks | Nine tests: six passed, three failed. All three seat-preview checks and both updated media checks passed. The final two-test rerun passed the movie metadata/release-market check and failed the Coming Soon sort/background check. These runs overlap; their totals must not be added together. |
| README rendering | Mermaid parsed successfully; Markdown and all local screenshots rendered at 1120px and 390px without horizontal overflow. Eleven genuine app screenshots are included. |
| Real local demo flow | Registered a test account, saved Watchlist entries, held seats, selected snacks, completed backend demo checkout, and captured Profile/My Tickets with the generated QR. No real payment was processed. |

The full browser suite was not rerun after all fixture corrections. Outstanding checks include exact camera-preset return precision (observed position delta 0.1596 against a 0.002 threshold), mobile projection containment, touch picking and idle-frame expectations, and the Coming Soon list becoming empty after selecting Top rated in the background test. Some broad failures assert older navbar styles or short ticket-animation phases. These require reproduction and classification; neither all failures nor all remaining behaviour are claimed fixed. Camera tolerances and visual expectations were not relaxed to obtain passing results.

No lint rules were disabled and no tests were deleted. Many strict lint findings remain around imperative Three.js objects, React effects, and test-only typing. Those require individual review; a passing production build is not evidence that lint is clean.

The browser suite includes older assertions from earlier page designs, dynamic catalogue data, live remote media checks, and software-WebGL rendering. Failures need classification before changing application behaviour. In particular, this cleanup does not claim to redesign mobile camera framing or guarantee uninterrupted third-party video playback.

Visual preservation is checked through the source diff (no stylesheet, runtime artwork, seat geometry, or layout redesign), representative browser checks, and reviewed application captures. No blanket claim of a pixel-identical automated baseline across every route is made.

## How to explain MovieVerse in an interview

Start at `components/MovieVerse.tsx`: it selects the page from the current path and lazily loads substantial pages. Follow a single action all the way through its UI, API request, database operation, and response rather than trying to memorise every component.

| Flow | Read in this order | What to explain |
| --- | --- | --- |
| Frontend and backend | `components/MovieVerse.tsx` → a page component → `lib/client.ts` → `app/api/[action]/route.ts` | UI actions call same-origin APIs. The Worker runs the request handler; browser state is not booking authority. |
| Authentication | `components/Account.tsx` → session/login/register actions in the API route → `db/schema.ts` | Passwords are derived with PBKDF2 and a salt. Session cookies are HttpOnly; only the token hash is stored. Authentication rotates the session and attaches guest bookings. |
| Catalogue and search | `lib/discovery-collections.ts` → `lib/catalogue-sync.ts` → `lib/catalogue-read.ts` → `lib/discovery-client.ts` | TMDB metadata is imported into D1 using stable IDs. Collections publish complete generations. Search reads stored records; server credentials never go to the browser. |
| Watchlist | `WatchlistButton.tsx` / `WatchlistPage.tsx` → `lib/watchlist-client.ts` → API Watchlist action → `lib/watchlist.ts` | Optimistic UI is shared across pages and rolled back on failure. The server derives the account from the session. A composite key prevents duplicates without copying movie records. |
| Cinemas and showtimes | `CinemaDirectory.tsx` / `MovieShowtimes.tsx` → `lib/providers.ts` and `lib/cinema-listings.ts` | The sourced directory, illustrative screenings, and licensed-provider boundary have different meanings. A TMDB release does not prove local inventory. |
| 3D seat interaction | `BookingFlow.tsx` → `SeatScene.tsx` → `auditorium/SeatRenderer.tsx` / `AuditoriumCamera.tsx` → `lib/auditorium.ts` | Layout coordinates produce seat meshes. Picking uses stable seat IDs. The 2D map and 3D scene share selection. Camera previews use actual seat positions. |
| Seat reservation | `BookingFlow.reserve` → `bookingProvider.hold` → hold action → inventory/show-blueprint tables | The backend validates the physical selection, then acquires a timed hold atomically. An immutable layout snapshot protects an existing show from later editor changes. |
| Checkout and tickets | `CheckoutExperience.tsx` → checkout action → `lib/booking.ts` → `CinematicTicketExperience.tsx` / `DigitalTicket.tsx` | The server recomputes price, validates held ownership and expiry, and uses an idempotency key. Payment is simulated. Tickets use saved snapshots; QR verification checks booking status. |
| Media | `lib/video/sources.ts` → `useMoviePlayback.ts` / `EmbeddedCinemaTrailer.tsx` → `CinemaScreen.tsx` | Official YouTube embeds and authorized hosted media need different rendering paths. Hosted media uses VideoTexture; lifecycle cleanup stops abandoned players and disposes resources. |

For tradeoffs, discuss why the app keeps discovery separate from bookable inventory, why a hold needs a transaction, why client totals are recalculated on the server, and why media decoding and WebGL rendering are separate systems. These are more useful explanations than claiming the demo has production cinema or payment integrations.
