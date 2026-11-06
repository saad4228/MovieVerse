# Self-updating MovieVerse catalogue

Subsequent design decision: the homepage hero now uses `/api/bookable-featured?city=...`, selecting only future configured demo screenings in the selected city and excluding films whose screenings are all known to be sold out. Synchronized TMDB artwork is reused for matching records. The global discovery catalogue and other homepage discovery collections remain D1-backed. Editorial discovery pins never manufacture bookable inventory.

## What changed

Public movie discovery reads the existing Cloudflare D1 binding. The same TMDB service imports movie detail records and publishes independently versioned collection memberships. There is no second database, client-side API token, or per-card TMDB request.

The homepage panorama, Indian Now Playing rail, upcoming rail, trending/popular/regional selections, poster wall and authentication collage use the synchronized catalogue. Movies defaults to the worldwide catalogue with pagination and Hollywood, Indian, international, trending, popular, current and classics filters. Coming Soon offers verified Indian theatrical dates, US-origin theatrical releases in the US, and explicitly labelled global primary releases. Genre pages and navigation search read D1. Individual `tmdb-*` detail pages also read D1, including credits and source attribution.

The old demo cinema experience is preserved separately. A discovered movie does not create showtimes, seat inventory or payment support. A linked, existing demo film may open its simulated screenings. The Movies collection menu includes an explicitly labelled simulated-booking catalogue.

## Audit of bundled sources

| Source | Previous use | Current use |
|---|---|---|
| `lib/catalog.ts`: `seedMovies` | Homepage/listings plus demo inventory | Demo fixtures and backwards-compatible booking IDs only |
| `data/coming-soon-movies.json` | Permanent upcoming additions | Legacy demo records only; no public Coming Soon source |
| `data/discovery-movies.json` | Permanent discovery expansion | Legacy demo metadata only; no public discovery collection source |
| `Home.tsx`: preferred movie ID array | Hero selection | Removed; balanced D1 featured selection |
| `Home.tsx`: `cityMovies` / `discoverySections` | Now Showing, upcoming, regional and curated rails | Replaced by synchronized collection queries |
| `Discovery.tsx`: bundled `movies` list and Avengers ordering | Main Movies/Coming Soon | Replaced by D1 pagination; bundled list only for explicit demo filter |
| `Navigation.tsx`: bundled movie search | Global search | Replaced by D1 title/original-title/cast search |
| `PosterWall.tsx`, `AuthPosterCollage.tsx` | Bundled decorative film posters | Synchronized popular artwork |
| `data/movie-details.json`, `data/movie-media.json`, HD media maps | Fixture information/art overrides | Retained for legacy demo pages and existing booking snapshots |
| `data/discovery-evidence.json` | Saved external listing references | Not a movie discovery source; never creates live inventory |
| `lib/catalog-upgrade.ts`, D1 `catalog_config` | Demo admin configuration | Preserved for venues, layouts, snacks, demo screenings and old bookings |

Genre labels and query definitions are not hardcoded movie lists. Official TMDB genre IDs define the new genre collections. Country of origin and original language remain independent filters.

## Import and removal rules

Endpoints: `trending/movie/day`, `trending/movie/week`, `movie/popular`, `movie/top_rated`, `movie/now_playing`, `movie/upcoming`, `discover/movie`, `genre/movie/list`, and `movie/{id}` with credits, videos, images and release_dates.

`lib/discovery-collections.ts` defines the bounded import window. Most sources import 2–5 pages, not just the first 20 films. Full refreshes cover US origin, US classics/top-rated/recent/future, Indian origin and seven regional languages, eight additional international production origins, all 19 genres worldwide and all 19 US-origin genre queries. Coming Soon discovers the next 18 months, with Indian/US theatrical release types 2 and 3. Regional dates come from detail release data; primary global dates never stand in for an Indian theatrical date. Dates are compared in Asia/Kolkata.

Records use stable TMDB IDs. First import time is retained; metadata and per-collection last-seen times update. Full scheduled runs refresh metadata; trending and chunked manual runs reuse fresh metadata for up to one day except volatile regional release collections.

Memberships are staged under a new generation. Only after every configured page, detail fetch and staging write succeeds does the active generation pointer change. Removed memberships are counted; the underlying movie remains in All Movies and its applicable genres. A later failed page or staging write keeps the old collection. Current generation reads exclude passed upcoming dates even before the next job. Postponed dates qualify again when verified by a later successful refresh. Provider pages that are unexpectedly empty or change pagination are rejected.

Retries are bounded (three attempts) with backoff; concurrency is four detail requests. Authentication errors stop the run. A D1 lease prevents overlapping runs and expires after a crashed worker. Runs are recorded as running, success, partial or failed; partial runs never become successful full imports. Successfully refreshed independent collections may publish even when another collection fails.

The catalogue intentionally retains older validated films instead of accumulating them in Trending/Now Playing. Import windows are bounded and are not an exhaustive copy of TMDB. Co-productions can belong to several origin groups.

## Refresh schedule and caching

- Full: `0 3 * * *` — daily 03:00 UTC / 08:30 IST.
- Trending only: `0 */6 * * *` — every six hours UTC, without a full reimport.
- Worker entry point: `worker/index.ts`, `scheduled()`.
- Permanent configuration: `vite.config.ts`; build output is not hand-edited.
- Public API cache: 120 seconds plus 60 seconds stale-while-revalidate. Client query cache: five minutes, refreshed on focus and at five-minute intervals. An already open page can therefore take several minutes to show a new successful import.
- Last loaded client data and last successful database generations survive transient API/provider failures. An empty initial database shows an explicit preparation state and a separate demo-booking link, not a curated list disguised as live data.

The full import makes more subrequests than the Workers Free per-invocation limit. Use a Workers plan with sufficient subrequest/CPU allowance (normally Workers Paid) and check current account limits. The first local full import took about 6 minutes 47 seconds, within the scheduled 15-minute wall-clock window; runtime varies with provider/network conditions. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

## Local operation

Node 24 is used for the local importer (`node:sqlite` and TypeScript transformation). It targets only the checkout-local `.wrangler/state` D1 file, never production. It uses the same sync engine as the scheduled Worker, with Node networking. Do not copy or publish that database: it also contains local demo account/booking data.

```powershell
node --experimental-transform-types scripts/sync-catalogue-local.mjs
node --experimental-transform-types scripts/sync-catalogue-local.mjs --trending
node --experimental-transform-types scripts/sync-catalogue-local.mjs --status
```

Credentials are read privately from `.dev.vars`. An unmatched opening quote in the existing token configuration was corrected during implementation; the credential value was not changed or exposed.

## Protected administration

All these endpoints require `Authorization: Bearer <ADMIN_TOKEN>`, with no token in the URL:

- `GET /api/catalogue-status`: last successful full/trending runs, movie/origin counts, collection counts, genre counts, import/update/removal counts and failures.
- `POST /api/catalogue-diagnostic`: makes one protected, read-only `genre/movie/list` request from the deployed Worker. Its response and Worker logs include only token presence, upstream status, category, exception type, duration, request ID and sanitized provider details.
- `POST /api/catalogue-sync`: validated sync plan, one authorized collection refresh at a time, and final completion validation. Use the helper below rather than one long HTTP import.
- `POST /api/catalogue-pins` with JSON `{ "ids": [123, 456] }`: at most six existing TMDB movie IDs. Only authorized editorial pins; automatic discovery remains active.

Manual full refresh:

```powershell
$env:MOVIEVERSE_URL = "https://YOUR-PRODUCTION-HOST"
$adminSecret = Read-Host "Production ADMIN_TOKEN" -AsSecureString
$adminPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
  $env:ADMIN_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPointer)
  node scripts/sync-catalogue-remote.mjs
  # For a trending-only refresh, use: node scripts/sync-catalogue-remote.mjs --trending
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPointer)
  Remove-Item Env:\ADMIN_TOKEN -ErrorAction SilentlyContinue
}
```

The helper first fetches a protected plan, submits each collection and stops on failure. The final full/trending success record is created only after the backend verifies all required successful collection run IDs within two hours. Interrupted manual imports can be rerun; upserts are idempotent. Cron execution does not depend on site visits or this helper.

The protected status report records `failureCategories` and per-collection `category` values. `authentication`, `provider`, `rate_limit`, `network`, `invalid_response`, `configuration`, and `database` failures remain distinct; published generations are retained on failed refreshes.

## Production setup still required

No production deployment, Cloudflare login, production secret assignment or remote database write was performed in this task. Local success is not evidence that production Cron has fired.

1. Authenticate to the intended Cloudflare account and confirm it: `npx wrangler login`, then `npx wrangler whoami`.
2. List D1 databases with `npx wrangler d1 list`. The source config currently names the target `site-creator-d1`, but its all-zero ID is a placeholder. Select the existing **MovieVerse production** database only after confirming its identity. Do **not** use the unrelated `dropby-db`, and do not create a duplicate if the correct MovieVerse database already exists. If this is a genuinely new installation and no MovieVerse D1 exists, obtain the owner's approval before creating one with `npx wrangler d1 create site-creator-d1`.
3. Put the confirmed database name and real ID in `deployment.public.json` (`d1DatabaseName` and `d1DatabaseId`). If using an existing MovieVerse database with another name, use that exact name and ID. Keep the application binding named `DB`.
4. Build the production Worker config and verify its bindings and schedules:

```powershell
npm run build
Get-Content dist/server/wrangler.json | ConvertFrom-Json | Select-Object name,d1_databases,triggers
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

The generated config must name the intended Worker, bind `DB` to the confirmed MovieVerse D1, and contain both Cron expressions (`0 3 * * *` and `0 */6 * * *`).

5. Review remote migration status before any write:

```powershell
npx wrangler d1 migrations list DB --remote --config dist/server/wrangler.json
```

For a new, empty MovieVerse D1, take a backup and then apply pending migrations with `npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.json`. For a database whose schema was previously created by another host or migration system, stop and reconcile its actual schema and migration history first; do not replay initial migrations or execute a SQL file directly until the baseline is understood. No remote migration was run for this audit.

6. Deploy only after the database target and migration plan are confirmed:

```powershell
npx wrangler deploy --config dist/server/wrangler.json
```

7. Set backend secrets through secure interactive prompts (never pass secret values as command arguments):

```powershell
npx wrangler secret put TMDB_READ_TOKEN --config dist/server/wrangler.json
npx wrangler secret put ADMIN_TOKEN --config dist/server/wrangler.json
```

Alternatively, Cloudflare Dashboard → Workers & Pages → the deployed MovieVerse Worker → Settings → Variables and Secrets → add both as **Secrets**, not public variables. `.dev.vars` is local only. Never put either in `NEXT_PUBLIC_*`, frontend code or committed deployment JSON.

8. In Worker Settings, verify the `DB` binding points to the same production D1 and that daily `0 3 * * *` and six-hour `0 */6 * * *` schedules are active. Allow trigger propagation time.
9. After confirming the secrets and D1 binding, run the protected remote helper once for the initial production import. Inspect its protected status, rendered homepage, Hollywood filter and Coming Soon afterwards.
10. After the next scheduled events, check Workers Observability/invocation logs and protected status for newer successful run timestamps and production D1 changes. Token presence alone does not verify an API connection or Cron success.

TMDB region semantics are documented in [Discover Movie](https://developer.themoviedb.org/reference/discover-movie) and [Region Support](https://developer.themoviedb.org/docs/region-support). TMDB metadata does not establish city-level cinema inventory.

## Verification evidence from the initial local import

Full run `9bd9fa79-5b0c-4225-a82a-14469b4d6844`: **success**, 1,600 imported, zero collection failures.

| Group | Movies |
|---|---:|
| All movies | 1,600 |
| US-origin / Hollywood | 713 |
| Indian origin | 562 |
| Other international origins | 423 |
| Current Indian Now Playing | 91 |
| Future verified Indian theatrical releases | 98 |
| Future global primary releases | 75 |

Origin counts overlap for co-productions; they are not exclusive partitions.

| Genre | Count | Genre | Count |
|---|---:|---|---:|
| Action | 418 | Adventure | 230 |
| Animation | 149 | Comedy | 361 |
| Crime | 186 | Documentary | 62 |
| Drama | 761 | Family | 196 |
| Fantasy | 201 | History | 100 |
| Horror | 148 | Music | 78 |
| Mystery | 117 | Romance | 257 |
| Science Fiction | 126 | Thriller | 355 |
| TV Movie | 50 | War | 76 |
| Western | 51 | | |

These are measured local D1 counts, not invented targets or verified production counts. Subsequent successful refreshes can change them.

Unit coverage includes real SQLite/D1-style inserts and generation reconciliation, newly appearing records, overlapping genres, retained All Movies records, incomplete fetches, staging failures, passed/postponed dates, origin classification, authorization, sync leases and schedule routing. Browser checks compare rendered results with the real local D1 API. Production verification remains outstanding until the setup steps above are performed.

Verification completed: 124 unit tests passed; the real D1 discovery browser journey passed (including loaded hero posters, Hollywood pagination, genres, search, stored details and mobile Coming Soon). The full Nagpur demo-booking journey passed, covering snacks, failure/retry, QR, ticket download and history; the cross-session atomic-hold/idempotency test passed. Typecheck and production build passed. Generated Wrangler output contains both Cron expressions, packaged migration 0004 and no embedded TMDB credential.

The compiled Worker's local Wrangler scheduled HTTP emulation returned an exception before creating a sync run. That invocation is **not** counted as a successful Cron execution. The schedule-routing unit test and actual export in the production bundle were verified, but a real scheduled invocation with production bindings still needs verification in Cloudflare Observability. The successful initial import used the shared engine through Node and local D1, not a claimed production Cron run.
