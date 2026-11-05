# Performance audit and targeted optimization

## Scope and method

No loaded-page layouts, colours, typography, backgrounds, artwork, geometry, seat IDs, lights, pricing, availability or booking rules were changed. No dependencies were added. Route imports and component boundaries were reorganized; existing CSS is still loaded centrally to preserve appearance across navigation.

Baseline and final browser samples use the local Vite development server, Chromium hardware configuration, 1440 x 900 viewport, the same seven routes, and one worker. `tests/e2e/performance-audit.spec.ts` records long tasks, CLS, script resources, API requests, DOM size, sampled frame intervals and point-in-time JS heap. Raw results are in `outputs/performance-before.json` and `outputs/performance-after.json`.

These are diagnostic samples, not controlled production Core Web Vitals or field data. Development compilation, network artwork, dynamic content readiness and garbage collection vary. The fixed observation window can end before all below-fold content mounts; heap and timing reductions must not be treated as statistically established memory savings. LCP and INP were not measured as production field metrics. CLS was worse on several final samples and remains unresolved; no fade-in or design change was used to hide it.

## Identified bottlenecks and changes

1. The shared shell eagerly imported browsing, profile, ticket and discovery pages. It now uses route-level React lazy boundaries. Shared poster cards were extracted out of Home so discovering a movie no longer imports the complete homepage. Trailer modal playback loads only when requested. Heavy 3D and HLS modules remain separately loaded.
2. The closed navbar search fetched both an empty search and the large homepage catalogue on normal pages. Those requests now start only when search is opened; text searches remain debounced. The global search still returns real catalogue results.
3. Catalogue refreshes generated new React state even for unchanged cached objects. Stable results now preserve state identity. One shared visible-document refresh subscription replaces a timer and focus listener per collection. The last subscriber releases all listeners and the timer. Requests do not refresh while the document is hidden. Cache limits and existing query deduplication remain intact.
4. Catalogue entities previously mutated existing objects. Refresh now preserves identity only for unchanged metadata and replaces changed objects, keeping memoized poster cards current. Poster cards use memoization; unchanged cards no longer rerender with unrelated page state. Rails measure again when card keys or dimensions change rather than every new children array.
5. Automatic homepage rotation continued off-screen. IntersectionObserver now suspends animation frames when outside the viewport and resumes on return. Existing styles, motion, controls and reduced-motion behaviour remain.
6. Theatre native video timeupdate events updated React progress despite there being no projection progress readout. Presented video frames and VideoTexture still update independently; only that unused React work was removed.
7. Seat lift frame callbacks visited every seat even when none were moving. They now visit active indices only and remove settled seats. Geometry keys are memoized. The scene and callbacks are stabilized. The booking clock runs only when a real hold expiry exists. Seat selection, pair rules and reservation logic are unchanged.

## Route samples (before / after)

| Route | Script resources | API requests | Long-task ms | CLS |
|---|---:|---:|---:|---:|
| / | 212 / 182 | 6 / 5 | 2901 / 610 | 0.039 / 0.185 |
| /movies | 212 / 196 | 6 / 4 | 415 / 503 | 0.281 / 0.284 |
| /explore | 212 / 196 | 10 / 8 | 1441 / 827 | 0.022 / 0.116 |
| /movies/coolie | 212 / 195 | 5 / 5 | 652 / 419 | 0.0 / 0.185 |
| /cinemas | 212 / 195 | 5 / 3 | 713 / 0 | 0.001 / 0.095 |
| /account | 212 / 181 | 6 / 4 | 223 / 0 | 0.0 / 0.009 |
| /watchlist | 212 / 175 | 5 / 3 | 63 / 56 | 0.001 / 0.004 |

Script counts are development module requests, not production bundle byte counts. The main deterministic request reduction is two fewer speculative API calls on pages such as Cinemas, Profile and Watchlist. Home still needs its own discovery request.

## Theatre comparison

The same native GPU renderer, tour, auditorium and quality yielded 39.84 rendered FPS before and 41.31 after. Draw calls stayed at 94 and triangles at 2,638,768. This is a modest sample improvement, not a 60 FPS guarantee. Paused idle frames over three seconds fell from 5 to 0. Raw samples: `outputs/theatre-before.json` and `outputs/theatre-after.json`. Software fallback samples are not comparable and were excluded from this comparison.

Existing instanced seats, static architecture batching, demand rendering, adaptive DPR, native video frame invalidation and resource disposal were already present. They were retained, not claimed as newly implemented. Sustained tour rendering remains GPU-heavy at the existing visual quality.

## Production build and verification

Typecheck, 136 unit tests across 20 files and the production build passed. The minified MovieVerse entry chunk changed from 259,575 bytes to 22,014 bytes (about 91.5% smaller). This is route separation, not a claim that the entire application is 91.5% smaller: the same features now live in deferred Home (21,955 bytes), Discovery (49,180), Account (59,269), Explore (5,729) and other shared chunks. The deferred SeatScene remains 1,327,582 bytes and HLS 579,961 bytes. The build still reports large-chunk warnings for the heavy experiences.

Passing browser checks covered desktop/mobile checkout and coupons, payment failure recovery and real reservation persistence, Watchlist account isolation and synchronization, movie heroes, homepage carousel, Explore navigation, closed-search request suppression, off-screen carousel suspension, GPU tour sampling, paused idle rendering, and occupied/non-selectable-screen seat interactions. The seat interaction spec had a regex matching `unavailable` as well as `available`; this test selector was corrected and the interaction then passed.

Broader regression attempts were not all green. Legacy journey specs still expect the previous Movies page title and collection selector. The camera-boundary test disagrees with its expected Overview coordinates by about 0.16; the three larger-screen seat-preview cases encounter a browser timeout/null-timeout error or cannot find View from this seat in their current mode. Those tests remain unresolved; they are not counted as passing and no camera geometry or preview controls were changed to conceal their failures. An earlier mixed GPU run crashed a browser target; the standalone native-GPU tour and paused-idle reruns passed. Traces are retained by Playwright for failures.

## Files

- `components/MovieVerse.tsx`: route loading boundaries and unchanged shared styles.
- `components/MovieCards.tsx`, `components/Home.tsx`, discovery/genre/Explore card imports: shared memoized cards and deferred trailer player.
- `components/Navigation.tsx`, `lib/discovery-client.ts`, `lib/genre-client.ts`, `lib/visible-refresh.ts`: request scheduling, identity and refresh lifecycle.
- `components/CinematicCarousel.tsx`, `components/MovieRail.tsx`: off-screen scheduling and stable measurement lifecycle.
- `components/BookingFlow.tsx`, `components/SeatScene.tsx`, `components/auditorium/SeatRenderer.tsx`, `components/video/useMoviePlayback.ts`: clock, scene, lift and video updates.

## Remaining constraints

Production Core Web Vitals, cold-cache field behaviour and long-session GPU memory require a deployed production measurement. Development CLI timing is not evidence of production latency. The 1.3 MB theatre chunk and HLS decoder are substantial but already deferred; shrinking them further without visual or feature changes needs separate dependency analysis. Large catalogue pages and artwork decoding still contribute to work on Explore. No shadows, geometry detail or image resolution were reduced to obtain the results above.
