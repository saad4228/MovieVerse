# Testing

Run `npm run typecheck`, `npm test`, `npm run test:e2e` against a running local server, then `npm run build`. Vitest uses its own config to avoid loading Worker/Vite production plugins. Playwright uses Chromium with software WebGL for reproducible scene checks. Set TEST_BASE_URL to test another origin.

Unit coverage: city/venue separation, screening identity, dates, structurally distinct layouts, stable unique coordinates, group adjacency, aisle avoidance, inventory exclusion, class preferences, recliner pairs, ticket/snack/fee/tax/promo totals and deterministic seeded availability.

Browser journeys: Nagpur movie-first booking with failure/retry, food, discount, QR download/history/cancellation; Mumbai cinema-first discovery then city invalidation/persistence; two independent API sessions racing for a group; idempotent checkout and private history; mobile registration/logout/login and overflow; licensed film playback on a WebGL screen, camera changes, pause/resume, My View and 2D parity; Studio blueprint editing and unauthorised write rejection.

The current browser suite includes 16 journeys: the original booking/account/discovery checks plus clean trailer fallbacks, physical screen playback, actual 1080p/720p decoding, custom controls, source failure caching, HLS playback/quality, viewpoint arrows, free view, selected-seat inspection and mobile controls. Unit coverage additionally checks screen aspect-fit, room bounds, safe paths, source permission and cooldown expiry. Old DOM-projection tests were removed with that implementation.

`scripts/visual-qa.mjs` captures representative 1440×900 and 390×844 pages into ignored outputs and checks for uncaught page errors. Manual visual review used the supplied references. Safari/Firefox, a physical touch device, real cinema architecture and arbitrary production GLB models are not verified in this environment.
