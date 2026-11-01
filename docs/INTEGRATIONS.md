# Configurable media and live cinema listings

Movie records support `poster`, `posterSmall`, `backdrop`, legacy `trailer`, and a new `trailers` array. The array replaces the bundled source list, including an explicit empty array. `youtubeId` and YouTube source records supply official external links. Artwork URLs and custom trailer fields remain configurable in Demo Studio.

Direct source entries contain `id`, `provider` (`direct-mp4` or `hls`), `url`, `type`, `playbackAllowed`, optional `isPrimary`, actual `height`, `language`, `posterImage`, `attribution` and `licenseUrl`. Only permitted direct sources enter the custom player or VideoTexture. Remote sources must allow CORS, serve correct media types and ideally support byte ranges. HLS manifests and segments must both be accessible. The configured list can mix direct sources and official external links. Do not put a YouTube watch URL in an MP4 field.

See [video architecture and source evidence](VIDEO_AND_CAMERA_REFINEMENT.md). The same HTML5 playback hook drives the movie hero, centered custom trailer player and physical WebGL screen. Each mounted experience loads only its own active source. All-source failure retains movie artwork and an official link.

## Live listings adapter

Configure optional server variables `LIVE_SHOWTIMES_ENDPOINT` (HTTPS) and `LIVE_SHOWTIMES_TOKEN` (Bearer token). Use ignored `.dev.vars` locally or Sites environment variables when hosted. The browser never receives the token. The endpoint receives `city`, `movie` and `date` query parameters and must return:

```json
{
  "cityId": "chennai",
  "movieId": "jailer-2",
  "date": "2026-11-02",
  "venues": [{
    "id": "provider-venue-id",
    "name": "Provider cinema name",
    "address": "Provider address",
    "shows": [{
      "time": "18:30",
      "format": "IMAX",
      "language": "Tamil",
      "bookingUrl": "https://provider.example/checkout/show-id"
    }]
  }]
}
```

Return every venue screening the film in that city/date. Translate upstream movie IDs to catalog IDs in the adapter. Responses must match all three context fields. Requests time out after six seconds; errors return a directory with no invented screenings. Live results link to the provider's booking flow and do not borrow demo seats or simulated checkout. Real booking inside MovieVerse additionally requires seat-inventory, hold, payment and confirmation adapters.

Without a feed, the site offers demonstration bookings plus a labelled real venue directory and external listings links. Directory coverage is a source snapshot, not exhaustive. BookMyShow blocks automated requests from this environment; no unsupported scraping or fabricated live showtimes are used.

Cinema blueprints remain separate JSON records with dimensions, row/aisle configuration, screen size, and optional GLB/GLTF plus mesh-to-seat mapping. Real measurements can replace these inputs without changing the renderer.
