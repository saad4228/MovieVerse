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

`lib/discovery-collections.ts` defines the bounded import window without removing any collection definition. Priority Indian, Hollywood, release, and top-rated collections use one or two pages; international and genre discovery defaults to one page, while trending uses two pages. Full refreshes still cover US origin, US classics/top-rated/recent/future, Indian origin and seven regional languages, eight additional international production origins, all 19 genres worldwide and all 19 US-origin genre queries. Coming Soon discovers the next 18 months, with Indian/US theatrical release types 2 and 3. Regional dates come from detail release data; primary global dates never stand in for an Indian theatrical date. Dates are compared in Asia/Kolkata.

Records use stable TMDB IDs. First import time is retained; metadata and per-collection last-seen times update. Full scheduled runs refresh metadata; trending and chunked manual runs reuse fresh metadata for up to one day except volatile regional release collections.

Memberships are staged under a new generation. Only after every configured page, detail fetch and staging write succeeds does the active generation pointer change. Removed memberships are counted; the underlying movie remains in All Movies and its applicable genres. A later failed page or staging write keeps the old collection. Current generation reads exclude passed upcoming dates even before the next job. Postponed dates qualify again when verified by a later successful refresh. Provider pages that are unexpectedly empty or change pagination are rejected.

Retries are bounded (three attempts) with backoff; concurrency is four detail requests and each continuation enriches only one movie to leave CPU headroom. Authentication errors stop the run. A fenced D1 lease prevents overlapping runs and expires after a crashed worker; staging and publication writes verify the owner and fence. Runs are recorded as running, success, partial or failed; partial runs never become successful full imports. Successfully refreshed independent collections may publish even when another collection fails.

The catalogue intentionally retains older validated films instead of accumulating them in Trending/Now Playing. Import windows are bounded and are not an exhaustive copy of TMDB. Co-productions can belong to several origin groups.

## Refresh schedule and caching

- Full: `0 3 * * *` — daily 03:00 UTC / 08:30 IST, through GitHub Actions.
- Trending only: `0 */6 * * *` — every six hours UTC, through GitHub Actions.
- Importer: `scripts/sync-catalogue-remote.mjs`, executed with Node.js 24.
- Worker entry point: `worker/index.ts`; its scheduled handler is retained only as a lightweight compatibility log and is not a catalogue importer.
- Permanent configuration: `vite.config.ts`; build output is not hand-edited.
- Public API cache: 120 seconds plus 60 seconds stale-while-revalidate. Client query cache: five minutes, refreshed on focus and at five-minute intervals. An already open page can therefore take several minutes to show a new successful import.
- Last loaded client data and last successful database generations survive transient API/provider failures. An empty initial database shows an explicit preparation state and a separate demo-booking link, not a curated list disguised as live data.

The external importer spreads its pages and detail batches across authenticated prepared-batch requests. The Worker performs only the D1 operations for each batch, with existing fencing and publication protections. The protected status endpoint counts durable page/detail/genre batch records rather than estimating completion from item counts. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) for the lightweight Worker request constraints.

The current full plan retains the existing 67 collection definitions and is now bounded to 85 provider pages (the exact count is derived from `collectionPlan("full")`). At the maximum 20 results per page, this caps the initial staged catalogue at roughly 1,700 candidate items before duplicate IDs, validation, filtering, and cache reuse. Detail enrichment remains resumable and idempotent; the smaller page window reduces unnecessary TMDB detail calls while preserving search, genre, detail, trending, Indian release, regional, Hollywood, international, and homepage coverage.

Before production rollout, measure CPU separately for HTTP and scheduled continuations in an isolated Worker/D1 environment with the same build and representative TMDB fixtures or test credentials. The CPU test Worker emits a correlation ID and operation type for every invocation; correlate those logs with Cloudflare tail/Trace Events and record p50/p95/p99 for genre, page, detail, publication and status steps. Network wall time and JavaScript wall-clock timers are not CPU measurements. Do not use production D1 or unrelated databases for this exercise. Production rollout remains blocked until representative HTTP and native Cron samples stay below 10 ms with margin.

## Local operation

Node 24 is used for the external importer and local tooling. The external importer performs TMDB fetching, JSON parsing, schema validation, normalization, collection planning, detail enrichment, batching, and orchestration. The Worker performs only authenticated lease/fencing checks, prepared D1 batch writes, generation staging, and atomic publication. The local importer targets only the checkout-local `.wrangler/state` D1 file, never production. Do not copy or publish that database: it also contains local demo account/booking data.

```powershell
node --experimental-transform-types scripts/sync-catalogue-local.mjs
node --experimental-transform-types scripts/sync-catalogue-local.mjs --trending
node --experimental-transform-types scripts/sync-catalogue-local.mjs --status
```

Credentials are read privately from `.dev.vars`. An unmatched opening quote in the existing token configuration was corrected during implementation; the credential value was not changed or exposed.

## Protected administration

All these endpoints require `Authorization: Bearer <ADMIN_TOKEN>`, with no token in the URL:

- `GET /api/catalogue-status`: last successful full/trending runs, movie/origin counts, collection counts, genre counts, import/update/removal counts and failures.
- `POST /api/catalogue-sync` supports resumable `start`, `next`, `resume`, and `status` operations. Each continuation persists its page/detail checkpoint in D1 and stays below the 25-request external budget.
- `POST /api/catalogue-diagnostic`: makes one protected, read-only `genre/movie/list` request from the deployed Worker. Its response and Worker logs include only token presence, upstream status, category, exception type, duration, request ID and sanitized provider details.
- `POST /api/catalogue-sync` with `operation: "refresh"` remains available for compatibility collection refreshes; production imports should use the resumable operations and helper below.
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

The remote helper starts or resumes one D1-backed run and requests one bounded continuation at a time. It can be interrupted and restarted without losing page, detail, retry, or publication progress. A run is successful only after every planned collection has completed and published its generation.

GitHub Actions owns the daily full refresh (`0 3 * * *`) and six-hour trending refresh (`0 */6 * * *`) schedules. The workflow uses one shared non-cancelling concurrency group, so full and trending imports cannot overlap. The production Worker configuration has no catalogue Cron triggers. Every prepared batch uses the existing fenced lease and publication protections.

The protected status report records `failureCategories` and per-collection `category` values. `authentication`, `provider`, `rate_limit`, `network`, `invalid_response`, `configuration`, and `database` failures remain distinct; published generations are retained on failed refreshes.

## Production setup still required

No production deployment, Cloudflare login, production secret assignment or remote database write was performed in this task. Local success is not evidence that production Cron has fired.

1. Authenticate to the intended Cloudflare account and confirm it: `npx wrangler login`, then `npx wrangler whoami`.
2. Verify D1 identity without writing:

   ```powershell
   npx wrangler d1 list --json
   npx wrangler d1 info site-creator-d1 --json
   Get-Content .\dist\server\wrangler.json -Raw | ConvertFrom-Json |
     Select-Object -ExpandProperty d1_databases
   ```

   Select the existing **MovieVerse production** database only after confirming its name and ID. Do **not** use the unrelated `dropby-db`, and do not create a duplicate if the correct MovieVerse database already exists.
3. Put the confirmed database name and real ID in `deployment.public.json` (`d1DatabaseName` and `d1DatabaseId`). If using an existing MovieVerse database with another name, use that exact name and ID. Keep the application binding named `DB`.
4. Build the production Worker config and verify its bindings. Catalogue schedules belong to GitHub Actions, not the Worker:

```powershell
npm run build
Get-Content dist/server/wrangler.json | ConvertFrom-Json | Select-Object name,d1_databases,triggers
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

The generated config must name the intended Worker, bind `DB` to the confirmed MovieVerse D1, and omit catalogue Cron triggers. The `triggers` property should be absent unless an unrelated Worker schedule is intentionally added.

5. Export a backup before migration:

   ```powershell
   New-Item -ItemType Directory -Force .\backups | Out-Null
   $backup = ".\backups\movieverse-site-creator-d1-$(Get-Date -Format yyyyMMdd-HHmmss).sql"
   npx wrangler d1 export site-creator-d1 --remote `
     --output $backup `
     --config .\dist\server\wrangler.json
   ```

6. Review remote migration status before any write:

```powershell
npx wrangler d1 migrations list DB --remote --config dist/server/wrangler.json
```

For a new, empty MovieVerse D1, take a backup and then apply pending migrations with `npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.json`. Migrations `0006_resumable_catalogue.sql` and `0007_resumable_coordination.sql` add only checkpoint, fencing and batch-accounting structures; they do not delete or rewrite existing catalogue, booking, account, or user data. For a database whose schema was previously created by another host or migration system, stop and reconcile its actual schema and migration history first; do not replay initial migrations or execute a SQL file directly until the baseline is understood.

7. Deploy only after the database target and migration plan are confirmed:

```powershell
npx wrangler deploy --config dist/server/wrangler.json
```

8. Keep the existing production `ADMIN_TOKEN` unchanged. Set backend secrets only if the existing deployment does not already have them, through secure interactive prompts:

```powershell
npx wrangler secret put TMDB_READ_TOKEN --config dist/server/wrangler.json
npx wrangler secret put ADMIN_TOKEN --config dist/server/wrangler.json
```

Alternatively, Cloudflare Dashboard → Workers & Pages → the deployed MovieVerse Worker → Settings → Variables and Secrets → add both as **Secrets**, not public variables. `.dev.vars` is local only. Never put either in `NEXT_PUBLIC_*`, frontend code or committed deployment JSON.

9. In Worker Settings, verify the `DB` binding points to the same production D1 and that no obsolete catalogue Cron triggers are configured.
10. Add the repository secrets `MOVIEVERSE_URL`, `ADMIN_TOKEN`, and `TMDB_READ_TOKEN`, then enable the `Catalogue sync` GitHub Actions workflow on the default `main` branch. Its shared concurrency group prevents full and trending imports from overlapping.
11. Start the workflow manually with `gh workflow run catalogue-sync.yml --repo saad4228/MovieVerse --ref main --field mode=trending`, then inspect the protected status response. Confirm a successful trending run, expected collection counts, new publication generations, zero failed batches, and no item failures before starting full mode with `--field mode=full`.
12. After the next scheduled GitHub Actions runs, check workflow logs and protected status for newer successful run timestamps and production D1 changes. Token presence alone does not verify an API connection or import success.

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

Verification completed: 124 unit tests passed; the real D1 discovery browser journey passed (including loaded hero posters, Hollywood pagination, genres, search, stored details and mobile Coming Soon). The full Nagpur demo-booking journey passed, covering snacks, failure/retry, QR, ticket download and history; the cross-session atomic-hold/idempotency test passed. Typecheck and production build passed. Generated Wrangler output has no catalogue Cron triggers, packages the migrations, and contains no embedded TMDB credential.

The compiled Worker's local Wrangler scheduled HTTP emulation returned an exception before creating a sync run. That invocation is **not** counted as a successful Cron execution. The schedule-routing unit test and actual export in the production bundle were verified, but a real scheduled invocation with production bindings still needs verification in Cloudflare Observability. The successful initial import used the shared engine through Node and local D1, not a claimed production Cron run.
