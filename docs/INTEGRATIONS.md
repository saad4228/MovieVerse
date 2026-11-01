# Configurable media and live cinema listings

Movie records support `poster`, `posterSmall`, `backdrop`, `trailer`, `youtubeId`, `trailerLabel`, `mediaCredit` and `mediaSource`. Direct MP4 takes precedence over YouTube. Change these fields in Demo Studio without changing the renderer. Explicit `youtubeId: null` disables a seeded embed. Legacy screenshot paths are upgraded by `lib/movie-media.ts`; custom URLs are preserved.

The YouTube IFrame Player API runs official players. A perspective homography aligns the auditorium player to the screen's projected corners as the camera moves. This is a DOM player, not a Three.js texture: cross-origin YouTube streams cannot be read into WebGL. Direct authorised MP4s use a real VideoTexture. Quality remains adaptive and is selectable with the official controls.

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
