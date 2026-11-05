# MovieVerse real-data implementation and setup

Implementation date: 3 November 2026. This is a local implementation. No production provider access or hosted deployment is claimed.

UI correction: the separate TMDB discovery panels, language selector and unavailable/retry boxes were subsequently removed from the homepage, movie browsing and coming-soon pages at the user's request. Those pages use their previous catalogue layout. The backend endpoints, adapters, direct TMDB detail route and QR printing fix remain available. The initial UI test results below describe the earlier integration checkpoint.

## What now works in code

- `GET /api/movie-discovery?section=trending|now-playing|upcoming|popular|top-rated&page=1&language=en-IN&window=day|week` is a server-side TMDB adapter. Now-playing and upcoming use `region=IN`. Trending is TMDB's global ranking, with an Indian display language; it is explicitly not an India-only ranking.
- `GET /api/tmdb-movie?id=<numeric-tmdb-id>&language=en-IN` fetches movie details, credits, videos, images and regional release dates. The UI uses `/movies/tmdb-<id>`; those IDs never enter the demo showtime generator.
- The homepage has separate TMDB trending, now-playing and upcoming sections. Movie browsing and coming-soon pages also expose provider discovery. Pagination and English/Hindi display preferences call the backend. Errors have retry controls; they never fill a TMDB section with bundled films.
- Metadata cards link to provider detail pages. They show no bookable shows unless a cinema provider actually supplies inventory. TMDB IDs and release dates do not establish city screenings.
- Existing local catalogue data and booking flows remain available as labelled demo content. The original metadata enrichment adapter accepts both supported credential forms and returns a provider error when a configured request fails. Unconfigured enrichment is explicitly identified as `bundled-catalogue` by the backend.
- TMDB responses use a bounded worker-memory cache, share in-flight requests, and expire after 15 minutes for discovery, one hour for details, and one day for genre names. HTTP success responses have a five-minute public cache. Error responses use `no-store`. Authentication failures have sanitized messages; 429 responses trigger a bounded cooldown, not an automatic retry loop. Worker restarts clear the in-memory cache.
- Credits include the TMDB notice and the official logo downloaded from the TMDB documentation asset at `https://files.readme.io/29c6fee-blue_short.svg`.

## Exact TMDB setup

The prior code required `TMDB_READ_TOKEN`. The completed adapter accepts **one** of:

| Backend variable | Value supplied privately by the operator |
| --- | --- |
| `TMDB_READ_TOKEN` | TMDB API Read Access Token (Bearer token), preferred |
| `TMDB_API_KEY` | TMDB v3 API key, used only if the read token is absent |

Obtain the credential from your own [TMDB API settings](https://www.themoviedb.org/settings/api). For commercial booking use, obtain TMDB's commercial permission as described in its [API FAQ](https://developer.themoviedb.org/docs/faq).

Local Workers development:

1. Create an ignored `.dev.vars` file in the app root. Use `.env.example` as a list of variable names; do not commit the completed file.
2. Set `TMDB_READ_TOKEN` to your token, or `TMDB_API_KEY` to your v3 key. Leave the unused option empty. These are backend bindings, never `NEXT_PUBLIC_*` or `VITE_*` variables.
3. Restart `npm run dev`. The local Cloudflare runtime loads `.dev.vars`. An existing process must restart to receive changed bindings. The local Vite configuration also forwards the same allowlisted variables from its process environment when starting a development server.
4. Run `node scripts/verify-live-metadata.mjs`. Optionally pass the base URL as the first argument. The verifier probes the actual backend and prints only source status, response status and returned counts/timestamps. Exit code 2 means live access was not verified.
5. Open the homepage and `/movies/tmdb-<id>` using an ID returned by the backend. Verify translated metadata, pagination, posters and source timestamps.

For a hosted Cloudflare Worker/Sites environment, set the same variables as **server secrets** using that deployment's supported secret settings and redeploy/restart. Local configuration does not configure hosted secrets. Do not put credentials into `.openai/hosting.json`, generated `dist` files, Git, browser code or a chat message. `.env.local` alone is not a reliable Worker binding source in this project; use `.dev.vars` or the allowlisted development process environment.

**Observed live test:** the actual local backend returned HTTP 503 with `TMDB_NOT_CONFIGURED` for trending, now-playing and upcoming. No successful live TMDB metadata request has been verified because credentials are missing. Fixture-based tests demonstrate integration behavior, not provider connectivity.

## Licensed showtime adapter

`lib/providers.ts` contains `demoShowtimeProvider`, which calls the existing demo generator. `lib/cinema-listings.ts` contains the separate server-side directory/production adapter; it does not import or call the demo generator. Test responses exist only in test files and cannot be selected as a production implementation.

| Variable | Meaning |
| --- | --- |
| `SHOWTIMES_MODE=directory` | Default, explicitly sourced directory only; no shows implied |
| `SHOWTIMES_MODE=production` | Use the approved external inventory feed |
| `LIVE_SHOWTIMES_ENDPOINT` | HTTPS URL of the operator's licensed normalized feed |
| `LIVE_SHOWTIMES_TOKEN` | Optional server-side Bearer credential, according to the feed contract |
| `LIVE_SHOWTIMES_APPROVED=true` | Operator attestation after licensing, coverage and mappings are approved |

If a legacy endpoint is configured without `SHOWTIMES_MODE`, the code chooses production mode and still requires approval. Unknown modes, including `mock`, return an explicit unavailable result. Production errors return an empty venue list and a visible error; they do not fall back to demo showtimes or directory venues. Deliberate directory mode returns sourced directory entries with empty show arrays.

The endpoint receives `city`, `movie` and `date`. Its JSON must follow this **MovieVerse normalization contract**, not a claimed native MovieXchange format:

```json
{
  "mode": "production",
  "providerId": "<licensed-provider-identifier>",
  "checked": "<ISO-8601 timestamp of the provider snapshot>",
  "cityId": "<matching MovieVerse city ID>",
  "movieId": "<matching MovieVerse movie ID>",
  "date": "<matching YYYY-MM-DD>",
  "complete": false,
  "venues": [{
    "id": "<mapped provider venue ID>",
    "name": "<provider cinema name>",
    "address": "<provider address>",
    "shows": [{
      "id": "<provider show ID>",
      "auditoriumId": "<provider screen ID>",
      "time": "<HH:mm in the venue's Indian local time>",
      "language": "<provider language>",
      "format": "<provider format>",
      "bookingUrl": "https://<approved-provider-booking-link>"
    }]
  }]
}
```

Optional fields: `price` in rupees with `currency: "INR"`, and `availability: "available" | "limited" | "sold-out" | "unknown"`. Omitted prices and availability remain unknown. A quote for final checkout must come from the transactional provider, not this display price.

The adapter validates city/movie/date identity, show and screen IDs, time syntax, INR currency for supplied prices, duplicate venue/show IDs, HTTPS destinations, and snapshot freshness (no older than two hours; no more than one minute in the future). Requests time out after six seconds and reject redirects. Responses are not cached by this adapter. This freshness rule is for reference schedules, never a source of truth for seat holds.

This path currently links to the provider's external booking flow. **It is not an in-app live seat, order, or payment adapter.** It cannot feed external show IDs into the demo seat map. Connecting a direct provider requires approved mappings for MovieVerse city/movie IDs and provider chain/venue/screen/film/show IDs, plus distinct live transactional adapters. Credentials do not manufacture those mappings or commercial rights.

## Ticket QR correction

The original PDF was generated and rasterized before the fix. Its QR area was blank and could not be decoded. The print QR wrapper had no explicit width while its image used a percentage width; the print flex layout could collapse that sizing. The old preparation also ignored asset decode failures.

`lib/ticket-print.ts` now generates a 960px PNG with a four-module quiet zone from the stable saved booking token. Print preparation embeds it in the cloned DOM, waits for fonts and all ticket images to decode, verifies nonzero intrinsic dimensions, and waits for layout before `window.print()`. Failures remove the temporary sheet and show an error instead of printing an incomplete ticket. Print CSS explicitly sizes the white QR wrapper and image; it does not depend on a CSS background.

The existing layout and printer timeline are preserved. The existing Download Ticket action exports a PNG; browser Print / Save as PDF produces the PDF. A separate server PDF download service has not been added.

Verification commands:

```text
npx playwright test tests/e2e/ticket-experience.spec.ts -g "real checkout prints"
python scripts/verify-ticket-pdf.py
```

The Python verifier uses `pypdfium2`, `opencv-python`, `numpy`, `pillow` and `pypdf`. It rasterizes the actual generated PDF, decodes its QR, checks the saved booking ID and demo label in PDF text, and decodes the downloaded PNG. Both decoded payloads must equal the saved booking's verification URL. It prints pass/fail evidence without printing the token. Optional installation: `python -m pip install pypdfium2 opencv-python numpy pillow pypdf`.

Observed result: one-page PDF; PDF and PNG QR codes both matched the saved booking credential; booking ID and demo label present. Artifacts are under `outputs/cinematic-ticket-print.pdf`, `outputs/cinematic-ticket-download.png` and `outputs/verified-ticket-pdf.png`.

## Validation completed

- TypeScript: `npm run typecheck` passed.
- Production build: `npm run build` passed. The build still reports large client chunks and Vinext's route-classification limitation; these are not provider-connectivity checks.
- Focused unit tests: 37 passed across `tests/tmdb.test.ts`, `tests/media.test.ts`, `tests/audit.test.ts` and `tests/booking.test.ts`. TMDB and showtime HTTP responses in these tests are fixtures.
- Browser tests: five passed, covering real demo-backend hold concurrency/idempotency, unavailable TMDB sections, fixture-backed discovery pagination/language/detail routing, refusal to print a failed QR decode, and the actual saved demo booking through replay/refresh/download/print.
- Actual localhost homepage: three explicit unconfigured discovery states and zero captured page errors. Screenshot: `outputs/live-discovery-actual-backend.png`.
- Actual PDF and PNG: decoded and compared to the saved demo booking URL with `scripts/verify-ticket-pdf.py`; all assertions passed.
- Production client JavaScript scan: no server TMDB credential names, TMDB upstream request implementation or authentication-error implementation was found in the built client assets.
- Successful authenticated live provider tests: none. Local TMDB bindings are missing; licensed cinema and payment access has not been supplied.

## Remaining external dependencies and work

- TMDB: missing API credentials and, for commercial deployment, appropriate commercial permission. Perform real authenticated tests after configuring access.
- Cinema inventory: obtain a signed Indian city/chain/venue coverage matrix, feed access, rate limits, allowed caching, pricing/tax semantics, booking/deep-link rights and commercial terms. Approval is not inferred from a public API page.
- Native live seat selection: not implemented in this increment. Requires actual seat layouts, hold/expiry semantics, server validation, provider concurrency guarantees and refresh/webhook behavior mapped to the existing 3D renderer.
- Production orders/payments: not implemented. Requires separately licensed transactional access, merchant credentials, trusted backend payment verification, provider confirmation, idempotency, failure reconciliation/refunds and supported admission credentials. Demo payment remains a simulation.
- Google Places, expanded cities and durable provider-mapping tables remain later roadmap phases. No schema migration was needed or performed in this increment.

See [provider investigation](CINEMA_PROVIDER_RESEARCH.md) for official sources and the exact unanswered access questions.

## Files changed in this increment

- TMDB/backend: `lib/tmdb.ts`, `lib/metadata-provider.ts`, `app/api/[action]/route.ts`.
- Discovery UI: `components/LiveMovieDiscovery.tsx`, `components/LiveMovieDetail.tsx`, `components/Home.tsx`, `components/Discovery.tsx`, `components/MovieVerse.tsx`, `app/live-discovery.css`, `app/layout.tsx`, `public/assets/tmdb-logo.svg`.
- Showtime safety: `lib/cinema-listings.ts`, `components/CityCinemaListings.tsx`.
- QR printing: `lib/ticket-print.ts`, `components/DigitalTicket.tsx`, `app/ticket-experience.css`.
- Configuration: `.env.example`, `vite.config.ts`, `cloudflare-env.d.ts`.
- Verification: `tests/tmdb.test.ts`, `tests/media.test.ts`, `tests/e2e/live-discovery.spec.ts`, `tests/e2e/ticket-experience.spec.ts`, `scripts/verify-live-metadata.mjs`, `scripts/verify-ticket-pdf.py`.
- Documentation: this file, `docs/CINEMA_PROVIDER_RESEARCH.md`, `docs/INTEGRATIONS.md`.

Earlier uncommitted project work is preserved; the list above identifies this increment rather than every pre-existing working-tree modification.
