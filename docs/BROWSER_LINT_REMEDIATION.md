# Browser and lint remediation

Verification date: 6 November 2026.

Follow-up to [the dependency security remediation](DEPENDENCY_SECURITY_REMEDIATION.md), on `security/dependency-remediation`.

The earlier report is a historical record. Its failed browser and lint results have not been erased. This follow-up records the investigation and subsequent verification. No push, merge, deployment, history rewrite, dependency downgrade or production-provider claim is part of this work.

## The five reproducible failures

| Area | Diagnosis | Correction |
| --- | --- | --- |
| City picker after returning from showtimes | Both the departing movie page and destination navbar have a button named after the selected city. The test clicked the departing screening-city tab before navigation committed. | Scope the click to the shared header. Keep the city, URL and preserved-filter assertions. Route-local modal state now resets before commit rather than in a later effect. |
| Extended HLS lifecycle | The original canvas-after-Back symptom was timing-dependent; a fresh extended probe passed. The lifecycle audit nevertheless found independent video/HLS cleanup effects, mutable instance ownership and late asynchronous callbacks that required hardening. | Explicit media-resource ownership, captured HLS instance, idempotent cleanup, disposal guards and generation checks. Destroy the source owner before detaching its media element, remove listeners and visibility callbacks, and prevent late playback after navigation. |
| Cold Tickets background, desktop | The recorder could exhaust its frame cap while catalogue loading was gated, or inspect only pre-content frames before the next animation frame observed the inserted ticket. Its failing predicate concerned the content transform, not background geometry. | Record throughout the bounded test lifetime and wait for a recorded content frame before inspecting samples. Original transform, geometry, opacity, artwork, preload and single-request assertions remain. |
| Cold Tickets background, tablet | Same sampling race. | Same shared test-harness correction. |
| Cold Tickets background, mobile | Same sampling race. | Same shared test-harness correction. |

The background artwork, positioning and CSS were not changed for these checks. No retries, skipped failures, longer test timeouts or wall-clock sleeps were added to conceal failures.

## Additional regression findings

- **Global search:** include matching local movie records alongside provider results, deduplicated by movie identity. A locally bookable title such as Sintel must remain searchable when the external catalogue has no result. Local entries retain their booking identity and simulation labels.
- **Mobile screen framing:** fit the actual screen corners in camera space, with a small aperture margin. Preserve the desktop lens when the screen already fits, screen proportions, seat positions and preview/free-camera controls. The camera-moving diagnostic now includes lens convergence.
- **Camera test geometry:** use the booking route's existing render-only blueprint refinement when calculating the expected Overview position. Collision and numeric tolerances remain unchanged. Diagnostic coordinates retain six decimal places instead of rounding a collision boundary to three.
- **Paused rendering:** lighting interpolation previously clamped every frame to 100 ms. On a slow renderer, a short transition therefore kept requesting frames for many seconds. Exponential damping now uses actual elapsed time. Unchanged inventory responses also retain their existing state identity rather than rebuilding the scene.
- **Mobile seat test:** open the existing summary sheet before asserting that its removal control is visible, then close it before testing a theatre drag. The selection and drag assertions remain.
- **Time-dependent visual fixtures:** the Coming Soon background/filter test now supplies explicit test-only catalogue records using existing local artwork. A changing or empty live upcoming collection must not determine whether a CSS regression test can run. Production catalogue behaviour is unchanged.
- **Current route contracts:** movie/cinema listing and authentication navbars are transparent; checkout uses theatre chrome; ticket confirmation uses glass. Older tests still expected glass everywhere, predating the approved route-specific designs. Updated checks verify each variant explicitly, including route transitions and glass stability throughout printing. Released-film discovery is tested on Explore, while Movies remains the bookable collection.
- **Ticket timing harness:** record READY and PREPARING when their DOM commits occur, including printer text and navbar styles. A protocol poll can miss a valid 240 ms phase. Assert the recorded order and contents, while retaining actual printing, replay, QR, download, print/PDF, refresh and no-duplicate-booking checks. Install the mobile test clock before navigation and fix wall time before pausing so the pause target cannot fall into the past.
- **Playback completion checks:** two MP4/HLS checks called the native media element's `play()` directly. That bypassed MovieVerse's paused-state controller, so the app correctly remained paused while the test expected an ended state. The checks now seek near the end and use the app's Play control; both provider fixtures pass. The production HLS cleanup changes remain independently covered.
- **Persisted coupon eligibility:** a stored snack coupon could become invalid after the snacks were removed. Checkout cleared the promo, but its initial state treated the eligibility as already observed, so no removal feedback appeared on mount. Eligibility is now checked from the current order and the store is cleared; discount calculation still applies at most once. The regression scenario passes.

## Lint work

The initial repository-wide lint run reported **160 errors and 71 warnings**. Corrections cover explicit test/diagnostic types, unused declarations, callback dependencies, stable material/geometry identities, render-time ref writes, impure render timestamps and effect-driven state resets. Shared identity-keyed state resets prevent stale route/entity UI from being committed first. Hydration uses an external-store snapshot.

Two narrowly documented compatibility decisions remain intentional:

1. `AssetImage` centralizes native image rendering. Local WebP assets and TMDB CDN sources are already optimized; print/canvas/CORS and exact source URLs must remain native. Its one-line `no-img-element` exception is documented at the implementation rather than repeated across the site. Image attributes, layout and loading behaviour are preserved.
2. The React immutability rule is scoped off only for the enumerated imperative Three.js, camera, media and owned-DOM adapters in `eslint.config.mjs`. These handles are external mutable systems. Other hooks rules stay enabled there, and immutability remains enabled in the rest of the application, including booking state. [React Three Fiber explicitly recommends mutations in frame callbacks](https://r3f.docs.pmnd.rs/advanced/pitfalls#avoid-setstate-in-loops). No global hooks-rule disable was added. The existing vendor-only shadcn exceptions are unchanged.

The state-reset approach follows [React's guidance on adjusting state when identity changes](https://react.dev/learn/you-might-not-need-an-effect). Clock setup follows the [Playwright clock lifecycle](https://playwright.dev/docs/clock).

## Changed implementation files

- Shared helpers: `hooks/use-resettable-state.ts`, `hooks/use-hydrated.ts`, `components/AssetImage.tsx`.
- Media ownership: `lib/video/resource.ts`, `components/video/useMoviePlayback.ts`, `components/video/MovieVideoPlayer.tsx`, `components/auditorium/CinemaScreen.tsx`, `components/auditorium/EmbeddedCinemaTrailer.tsx`.
- Search/state: `lib/movie-discovery.ts`, `components/Navigation.tsx`, `Account.tsx`, `BookingFlow.tsx`, `CatalogEditor.tsx`, `CheckoutExperience.tsx`, `CityCinemaListings.tsx`, `DigitalTicket.tsx`, `Discovery.tsx`, `GenreDiscovery.tsx`, `LiveMovieDetail.tsx`, `MovieShowtimes.tsx`, `CinematicTicketExperience.tsx` (component paths are under `components/`).
- Scene stability/framing: `lib/camera-framing.ts`, `components/CinemaMaterials.tsx`, `SeatScene.tsx`, `CinematicCarousel.tsx`, `MovieRail.tsx`, and `components/auditorium/{AuditoriumCamera,BalconyArchitecture,GrandStage,SeatRenderer,TheatreLighting}.tsx`.
- Native-image imports, without markup redesign: `AuthPosterCollage`, `Creator`, `ExploreMovieBanner`, `ExplorePage`, `Home`, `MovieCards`, `MovieInformation`, `PosterWall`, `ProfilePhoto`, `TmdbAttribution`, `WatchlistPage`, `ui` under `components/`, plus the components already listed above.
- Lint configuration and typed/regression tests: `eslint.config.mjs`, `tests/e2e/browser-fixtures.d.ts`, affected `tests/e2e/*.spec.ts`, `tests/grand-balcony.test.ts`, and new `tests/{video-resource,camera-framing,movie-search}.test.ts`.

Pre-existing security-cleanup and dependency-remediation changes remain in the working tree. Their manifests, lockfile, environment files and local databases were not replaced by this follow-up. Browser tests create synthetic records through the existing local application APIs.

## Verification

| Check | Result |
| --- | --- |
| Security and repository hygiene | Passed; no findings. |
| Explicit dependency audit | Zero informational, low, moderate, high or critical findings. |
| Dependency tree | No reported dependency problems. |
| Secured manifests | `package.json` and `package-lock.json` byte-identical to the start-of-follow-up secured baseline. |
| Typecheck | Passed. |
| Repository lint | Passed; zero errors or warnings. |
| Unit suite | 27 files, 161 tests passed (152 previous tests plus nine new regression tests). |
| Original five focused browser failures | Five passed. |
| Broader 16-case browser rerun | 14 passed; the two remaining issues were subsequently fixed and both passed a targeted rerun. |
| Paused theatre measurement | Targeted rerun recorded zero rendered frames over the three-second idle sample; the unchanged assertion requires fewer than five. |
| Actual exported QR | OpenCV decoded the downloaded PNG and a PDFium-rendered page of the generated print PDF; both exactly matched the saved booking's verification URL. No new application dependencies were installed for this check. |
| Complete Playwright/browser suite | Passed: 133 passed, 1 expected live-YouTube skip, 0 failed, 0 flaky. The skipped test requires `MOVIEVERSE_LIVE_YOUTUBE=1`; fixture-backed YouTube tests passed. |
| Final production build | Passed. Vite/Vinext emitted existing native-config, source-map, dynamic-import and large-chunk notices; they did not fail the build. |

The complete suite ran after the focused fixes. The existing opt-in live YouTube test requires `MOVIEVERSE_LIVE_YOUTUBE=1`; fixture-backed provider tests do not certify live YouTube availability.

Private logs and screenshots are under ignored `outputs/browser-lint/`. Browser traces can contain test-session cookies and must not be published.

## Production limits

Passing repository checks does not activate licensed cinema inventory or real payments. Existing demo bookings/payments remain simulations. The separately documented unused standalone `@vercel/og` Node-entry limitation and upstream build notices are not silently reclassified as resolved.
