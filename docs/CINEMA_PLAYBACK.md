# Cinema playback engine

## Diagnosis

Both provider paths already existed: an official YouTube IFrame API player transformed to the screen's world coordinates, and an HTML video/HLS player feeding a Three.js VideoTexture. No video extraction or new playback library was needed.

The investigation found:

- Muting YouTube could issue another play command because mute and pause shared an effect.
- A prepared MP4 was reused only after it became playable. Entering before that point restarted its request.
- Hosted buffering could discard the player after a short timeout; trailers looped instead of exposing an ended state.
- HLS quality capping used the detached video's CSS dimensions, which do not represent the cinema projection size.
- Hosted fitting always reduced the video plane; there was no configurable crop-to-fill mode.
- The YouTube iframe was fitted inside the aperture a second time, producing extra margins in non-16:9 auditoriums.
- Procedural auditoriums already occupied approximately 82% of usable wall width. They now use 85%, with the existing frame, curtains, ceiling envelope and front-apron sightline calculations following that geometry. Imported/explicit screen layouts retain their configured dimensions.

## Implementation

- `lib/video/controller.ts`: shared play/pause/mute/retry commands, lifecycle states and aspect-preserving projection-fit calculations.
- `components/BookingFlow.tsx`, `components/SeatScene.tsx`: common provider state/control wiring, outside-screen loading indicator, replay/retry controls and quality tooltip.
- `components/auditorium/EmbeddedCinemaTrailer.tsx`: official player readiness, stable buffering, ended/replay, visibility handling and full-aperture viewport. Poster remains visible before playback; no overlays are placed over provider branding.
- `components/video/useMoviePlayback.ts`: preserves in-progress MP4 preparation, retains decoded frames during ordinary buffering, separates mute from play, bounds HLS buffers and exposes ended state for auditorium playback. No empty HTML video player is allocated for YouTube-only sources.
- `components/auditorium/CinemaScreen.tsx`: persistent per-source VideoTexture, poster-to-video fade, shader update when the first texture attaches, configurable hosted fitting and full-aperture YouTube geometry. All screen meshes remain excluded from seat raycasting.
- `lib/video/youtube-api.ts`: cleans up failed script loads so retry can initialize cleanly.
- `lib/video/sources.ts`, `lib/catalog-config.ts`: configurable `fit` option for authorized hosted sources.
- `lib/auditorium.ts`: 85% procedural screen width, retaining 16:9 proportions and existing architecture/camera helpers.
- `components/seat-workspace.css`: small external loading indicator, respecting reduced motion.
- Tests: `tests/projection.test.ts`, `tests/auditorium.test.ts`, `tests/e2e/playback-engine.spec.ts`.

## Configure licensed hosted clips

Use an existing movie's `trailers` list. The following URL is a placeholder, not an installed source:

```json
{
  "id": "licensed-trailer",
  "provider": "hls",
  "url": "https://your-cdn.example/licensed/trailer/master.m3u8",
  "type": "official-trailer",
  "playbackAllowed": true,
  "isPrimary": true,
  "fit": "contain",
  "attribution": "Your authorized distributor"
}
```

Use `direct-mp4` for MP4. `contain` preserves the full frame and is the default. `cover` fills the aperture using centered UV cropping without distortion. Metadata supplies the decoded source dimensions; 16:9, 2.39:1, 1.85:1 and 4:3 fitting are tested. Serve media, HLS manifests, segments and keys with appropriate CORS headers. Existing authorization and signed URL requirements still apply. Mux/Cloudflare Stream can supply authorized HLS URLs through this configuration; no account or commercial integration was provisioned.

The HD/SD theatre toggle controls 3D rendering quality. HLS chooses video quality adaptively; YouTube manages its own rendition. The tooltip now makes that distinction explicit.

## Verification and limitations

Actual MP4 and HLS decoding were tested with the licensed Sintel sample and local HLS fixture. Tests exercise buffering, texture identity retention, pause/mute, ended/replay, selection and resource cleanup. Deterministic YouTube fixtures exercise state changes, errors, retry and single-player ownership. Existing tests cover autoplay blocking, alternate-source failure, quality selection, camera movement and seat preview.

Live YouTube requests for Jailer 2 and Coolie both reached `playing` with advancing playback time. Screenshots: `outputs/projection-live-jailer-2.png`, `outputs/projection-live-coolie.png`, and `outputs/projection-live-sintel.png`.

YouTube can still show titles, branding, subtitles and provider-owned overlays even with `controls=0`. No cross-origin styling, extraction, branding masks or fabricated hosted trailers were introduced. See the [official player parameters](https://developers.google.com/youtube/player_parameters) and [IFrame API reference](https://developers.google.com/youtube/iframe_api_reference).

Black bars encoded inside a video file, or letterboxing inside YouTube's player, are not CSS margins. The current Sintel sample contains encoded letterboxing. Metadata-based fitting cannot identify the active picture within those pixels; an authorized unletterboxed master is preferable for full-aperture presentation without losing picture content. Network buffering cannot be eliminated universally.

Software WebGL verification is not a hardware frame-rate benchmark.

Final checks passed: TypeScript typecheck, production build, 77 unit tests and 10 relevant browser tests, including the booking checkout/ticket regression. The YouTube lifecycle test also passed a subsequent fullscreen enter/exit check. The build retains warnings about large client chunks and vinext route classification; neither blocked the build.
