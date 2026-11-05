# Configurable media and live cinema listings

> Current setup and production safeguards: [real-data integration](REAL_DATA_INTEGRATION.md). Production requires explicit approval, `mode`, `providerId`, snapshot freshness, show IDs and screen IDs. Placeholder values in the illustrative sample below must be replaced by actual licensed provider values.

Movie records support `poster`, `posterSmall`, `backdrop`, legacy `trailer`, and a new `trailers` array. The array replaces the bundled source list, including an explicit empty array. `youtubeId` and YouTube source records supply official external links. Artwork URLs and custom trailer fields remain configurable in Demo Studio.

Direct source entries contain `id`, `provider` (`direct-mp4` or `hls`), `url`, `type`, `playbackAllowed`, optional `isPrimary`, actual `height`, `language`, `posterImage`, `attribution` and `licenseUrl`. Only permitted direct sources enter the custom player or VideoTexture. Remote sources must allow CORS, serve correct media types and ideally support byte ranges. HLS manifests and segments must both be accessible. The configured list can mix direct sources and official external links. Do not put a YouTube watch URL in an MP4 field.

See [video architecture and source evidence](VIDEO_AND_CAMERA_REFINEMENT.md). The same HTML5 playback hook drives the movie hero, centered custom trailer player and physical WebGL screen. Each mounted experience loads only its own active source. All-source failure retains movie artwork and an official link.

## Live listings adapter

Configure `SHOWTIMES_MODE=production`, `LIVE_SHOWTIMES_APPROVED=true`, `LIVE_SHOWTIMES_ENDPOINT` (HTTPS), and the feed's optional `LIVE_SHOWTIMES_TOKEN` (Bearer token) after licensing is approved. Use ignored `.dev.vars` locally or server secrets when hosted. The browser never receives the token. The endpoint receives `city`, `movie` and `date` query parameters and must return:

```json
{
  "mode": "production",
  "providerId": "<licensed-provider-id>",
  "checked": "<current ISO-8601 snapshot timestamp>",
  "cityId": "chennai",
  "movieId": "jailer-2",
  "date": "2026-11-02",
  "venues": [{
    "id": "provider-venue-id",
    "name": "Provider cinema name",
    "address": "Provider address",
    "shows": [{
      "id": "<provider-show-id>",
      "auditoriumId": "<provider-screen-id>",
      "time": "18:30",
      "format": "IMAX",
      "language": "Tamil",
      "bookingUrl": "https://provider.example/checkout/show-id"
    }]
  }]
}
```

Translate upstream movie IDs to catalog IDs in the adapter. Responses must match all three context fields, supply unique IDs and pass freshness validation. Mark `complete` only if coverage is complete for the requested context. Requests time out after six seconds; production errors return an explicit unavailable result with no venues or screenings. Deliberate `SHOWTIMES_MODE=directory` returns directory entries with empty show arrays. Live results link to the provider's booking flow and do not borrow demo seats or simulated checkout. Real booking inside MovieVerse additionally requires seat-inventory, hold, payment and confirmation adapters.

Without a feed, the site offers demonstration bookings plus a labelled real venue directory and external listings links. Directory coverage is a source snapshot, not exhaustive. BookMyShow blocks automated requests from this environment; no unsupported scraping or fabricated live showtimes are used.

Cinema blueprints remain separate JSON records with dimensions, row/aisle configuration, screen size, and optional GLB/GLTF plus mesh-to-seat mapping. Real measurements can replace these inputs without changing the renderer.

## Expansion provider contracts

- MovieMetadataProvider: `lib/metadata-provider.ts`, sourced bundled metadata when unconfigured and optional server-only TMDB enrichment. Set `TMDB_READ_TOKEN` or `TMDB_API_KEY` in ignored `.dev.vars` or hosted environment secrets. Identity is checked against the numeric TMDB movie ID. A configured provider failure returns an error rather than silently substituting bundled metadata. Dynamic discovery and complete detail fetching use `lib/tmdb.ts` separately.
- MovieImageProvider: `lib/image-provider.ts` resolves curated responsive artwork, dimensions, positioning and alternatives. `lib/asset-cache.ts` resolves locally cached performer and catalogue imagery. The ingestion scripts preserve source/delivered dimensions and do not enlarge images.
- CinemaDirectoryProvider: `lib/cinema-directory.ts` supplies stable branch records from `data/cinema-venues.json`. Add records for a configured city without changing the rendering engine. New cities also need their city configuration entry.
- ShowtimeProvider: `lib/providers.ts` exposes demo schedules; `lib/cinema-listings.ts` remains the separately authorised live/external provider boundary. Live responses may include `complete`, `auditoriumId`, `price`, and `availability`; `complete` defaults false. To connect directory detail pages, map upstream venue IDs to the directory's stable IDs.
- SeatInventoryProvider and BookingProvider: `lib/providers.ts` connect the booking UI to existing transactional D1 routes. They do not imply support for a real payment gateway.

An optional `screenings` array on each demo venue supports `{key,movieId,auditoriumId,blueprintId,time,language,format,price,date?}`. Keys are unique per venue. Multiple films can use the same auditorium if timings do not overlap (runtime plus a 20-minute turnaround). Its blueprint must remain consistent. Every screening/date has an independent inventory key. A saved show blueprint remains immutable for that show.

`GET /api/show-availability?shows=<comma-separated IDs>` accepts up to 40 valid screenings and reads persisted inventory. No existing inventory means `unknown`, never an invented available count. Summaries refresh every 20 seconds in discovery. Exact seats and holds are still checked transactionally when booking.

`catalogRevision: 2` marks the expansion. Older administrator snapshots receive only newly introduced film IDs in memory, preserving customised entries. Publishing revision 2 makes later deletions deliberate; removed films are not silently reintroduced. No stored catalogue is overwritten by the upgrade.
