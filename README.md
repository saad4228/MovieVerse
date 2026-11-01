# MovieVerse

Your universe. Your movie. Your seat.

A complete demonstration movie discovery and ticket booking application, inspired by the supplied cinematic mockups. Browse by city, movie or cinema; choose a show; explore an illustrative 3D auditorium; reserve seats; add snacks; simulate payment; and download a QR ticket.

## Run locally

Requires Node 22.13+ (developed with Node 24), npm and Git. No external API keys are needed for the demo.

```powershell
npm install
npm run build
# First installation only: apply each committed migration, in order.
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_rainy_unus.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_curvy_jack_power.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_glorious_energizer.sql
npm run dev
```

Open the Local URL printed by Vinext, normally http://127.0.0.1:5173. Do not replay migrations against an already initialised database. Local D1 persists in ignored `.wrangler/state/` and is separate from the deployed database.

```powershell
npm run typecheck
npm test
npm run test:e2e  # requires a running dev server and Playwright Chromium
npm run build
```

`npm start` previews the built Worker. To install the test browser if necessary, run `npx playwright install chromium`.

## Application

Routes: `/`, `/movies`, `/movies/:id`, `/coming-soon`, `/cinemas`, `/cinemas/:id`, `/booking/:showId/seats`, `/booking/:showId/snacks`, `/booking/:showId/checkout`, `/booking/confirmation/:id`, `/my-tickets`, `/account`, `/login`, `/register`, `/ticket/:token`, `/admin`.

The demo starts in Chennai and includes ten Indian cities and 23 illustrative venues. City changes invalidate the current booking. The default auditorium blueprints have 336, 168 and 84 seats. Screenings have independent persistent inventory and an eight-minute hold, acquired when continuing from seats. Booked and blocked seats cannot be purchased. Luxury recliners are sold in pairs. Up to eight seats can be booked together.

Each reference movie has its own official YouTube trailer or teaser in the movie hero, centered trailer dialog, and perspective-aligned auditorium screen. Sintel uses a bundled licensed MP4 and a native Three.js VideoTexture. YouTube controls quality and embedding availability; restricted videos provide an official watch link. Responsive posters retain up to 1200 pixels of width and matching backdrops up to 2560 pixels. The 2D map completes the same journey without WebGL. Test payments offer success, failure and cancellation outcomes. FIRSTSHOW discounts tickets by 10%, capped at ₹100.

## Architecture and configuration

The Next.js App Router API runs through **Vinext on Vite** for Cloudflare Worker/Sites compatibility. React 19.2.6 pairs with Fiber 9.8.2 and Drei 10.7.9. D1/SQLite replaces the preferred PostgreSQL/Supabase deployment because this build is hosted as one self-contained Worker with native D1. Zustand stores city preferences and resumable UI state; the server owns booking integrity. Passwords use Web Crypto PBKDF2, and random session cookies are HttpOnly.

Typed seed catalog: `lib/catalog.ts`. Runtime catalog changes are validated with Zod and saved in D1. Prices are computed in `lib/booking.ts` on both client and server. `.openai/hosting.json` declares the DB binding and Site identity. SQL and Drizzle metadata are committed under `drizzle/`.

`/admin` is the Demo Studio. It edits catalog records and venue screening schedules, previews/exports auditorium layouts and coordinates, configures custom GLB assets and mesh-to-seat mappings, and manages screening inventory. Set **ADMIN_TOKEN** through Sites environment variables to enable publishing. Local runtime secrets belong in the host environment/Workers development setup and must never be committed. There is no default administrator password or token. Drafting, previewing and exporting work without a token. JSON editors validate IDs, URLs and references. Active holds protect catalog updates; confirmed seats protect inventory updates. A saved screening blueprint is immutable even if future layouts change.

## Scope and assets

All cinema layouts, addresses, distances, ratings, release dates, screening availability and payment outcomes are demonstration data. No model claims measured architectural accuracy. No real ticket, food order, bank payment or email is issued. Guest tickets persist through the browser's session cookie; signing in attaches that session's guest bookings to the account.

The booking page includes a sourced city cinema directory with current-listings links, separate from demo screenings. A directory entry does not assert that the selected film is playing. Complete live availability requires an authorised cinema inventory feed; the `LIVE_SHOWTIMES_ENDPOINT` adapter validates city, movie and date before displaying provider results. See [integrations](docs/INTEGRATIONS.md). No live feed, payment gateway or email delivery is configured. Replacing D1 with PostgreSQL requires a repository adapter and migrations. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [asset credits](docs/ASSET_CREDITS.md).

The `mockups/` directory preserves the supplied design references. `scripts/prepare-assets.mjs` records the initial import and asset sources; runtime assets are already included and that machine-specific import does not need to be rerun.
