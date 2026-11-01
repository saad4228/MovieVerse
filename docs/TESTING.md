# Testing

Run `npm run typecheck`, `npm test`, `npm run test:e2e` against a running local server, then `npm run build`. Vitest uses its own config to avoid loading Worker/Vite production plugins. Playwright uses Chromium with software WebGL for reproducible scene checks. Set TEST_BASE_URL to test another origin.

Unit coverage: city/venue separation, screening identity, dates, structurally distinct layouts, stable unique coordinates, group adjacency, aisle avoidance, inventory exclusion, class preferences, recliner pairs, ticket/snack/fee/tax/promo totals and deterministic seeded availability.

Browser journeys: Nagpur movie-first booking with failure/retry, food, discount, QR download/history/cancellation; Mumbai cinema-first discovery then city invalidation/persistence; two independent API sessions racing for a group; idempotent checkout and private history; mobile registration/logout/login and overflow; licensed film playback on a WebGL screen, camera changes, pause/resume, My View and 2D parity; Studio blueprint editing and unauthorised write rejection.

Additional-reference coverage verifies panorama colour changes and continuous dragging, poster-wall discovery links, sample-film hero play/pause/audio controls, cinema sorting and mobile movie-detail overflow. HD media checks add centered trailer bounds, film-specific official players, date-change motion, continuous carousel wrapping, reduced motion, mobile overflow, and a projected movie screen across camera views. There are 12 Playwright journeys. Seventeen unit checks include projection corner accuracy/degenerate handling, movie media preservation and live provider city/date validation.

`scripts/visual-qa.mjs` captures representative 1440×900 and 390×844 pages into ignored outputs and checks for uncaught page errors. Manual visual review used the supplied references. Safari/Firefox, a physical touch device, real cinema architecture and arbitrary production GLB models are not verified in this environment.
