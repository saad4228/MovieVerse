# Video, camera and auditorium refinement

## Root causes found

- `ProjectedMovieScreen` transformed an HTML YouTube iframe over WebGL. A CSS perspective transform cannot participate in the scene depth buffer. Foreground seats and the balcony therefore could never occlude it. This overlay and its homography implementation have been removed.
- The camera effect depended on the full blueprint and seats objects. Each 10-second inventory response recreated those objects, restarting the camera. Tour animation also resumed every frame after manual input, and Drei's OrbitControls update competed with a second manual update.
- An unstable Canvas camera configuration could also reconfigure the camera during booking-state changes. It is now memoized by room dimensions.
- `useCinemaSurface` mutated the cached textures returned by `useTexture`. Curtains, upholstery and other surfaces changed one another's repeat scales. The contrast-heavy checked fabric diffuse was also unsuitable for solid upholstered cinema seats.
- The bundled Sintel MP4 was only 480p. Calling its presentation HD did not improve the source resolution.

## Direct video system

`data/trailer-sources.json` is the bundled source registry. The optional `trailers` array in each admin movie record overrides it, including an explicit empty array. Legacy `trailer` MP4/HLS URLs continue working. Each entry identifies provider, type, playback permission, primary preference, real height, attribution, optional license and poster. The catalog schema validates the same structure.

`useMoviePlayback` owns one HTML5 video element for its mounted experience. Direct sources are ordered by primary preference and actual height. MP4 uses the native decoder; HLS uses Safari native playback or a lazily imported HLS.js MSE adapter. HLS exposes Auto and manifest levels; distinct MP4 renditions preserve position on quality changes. Current decoded height is shown instead of a fabricated HD badge.

The player handles loading, buffering, pause, autoplay denial, media errors and fatal HLS errors. A failed URL is skipped for five minutes in the current tab, then eligible again. Loading/buffering has a bounded 15-second timeout; explicit retry clears the relevant failures. Autoplay denial offers a play action and is not treated as a restricted source. The last usable artwork remains visible before readiness and after exhausted sources. Official trailer links remain accessible. Page hiding, an offscreen hero and an open trailer dialog suspend playback. Cleanup pauses/unloads the element and destroys the HLS instance. Closing the dialog resumes the hero if the user had not paused it.

YouTube watch pages are external trailer links. No stream extraction, restricted-content retry loop, hidden iframe controls or over-canvas video layers remain. Direct movie-specific video still requires a source the application can actually play. This change does not invent a direct video URL for commercial films or present Sintel footage as another movie's trailer.

## Verified media and evidence

The official Blender server supplies the [1080p Sintel trailer](https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4) and [720p rendition](https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4). ffprobe verified H.264 at 1920×1080 and 1280×720, both 52.208 seconds. They are bundled unchanged because the remote response does not guarantee CORS for WebGL. Credit: © copyright Blender Foundation | www.sintel.org, [CC BY 3.0](https://durian.blender.org/sharing/). Original embedded credits are preserved.

[Sun Pictures](https://www.sunpictures.in/movies/coolie/), [YRF's War 2 announcement](https://www.yashrajfilms.com/news/detail/2025/07/25/yash-raj-films-unleashes-the-trailer-of-the-tentpole-movie-of-the-year-war-2-starring-hrithik-roshan-ntr-kiara-advani), [Sony](https://www.sonypictures.co.uk/latest-trailers), and [KVN](https://www.kvnproductions.co.in/movies) did not provide a confirmed licensed direct commercial trailer distribution source in this investigation. Existing official YouTube identities were verified; embed availability and age/region access were not inferred from identity.

## Physical screen

`CinemaScreen` applies an sRGB `VideoTexture` to an opaque, front-facing screen mesh with depth testing and depth writing enabled. The blueprint defines screen dimensions, position and optional yaw. A three-centimetre local screen offset prevents z-fighting; aspect-fit geometry letterboxes footage rather than stretching it. Artwork uses the same mesh when direct playback is unavailable. The frame, screen, seats and rails share one WebGL world and depth buffer.

A broad rectangular area light approximates screen illumination. A 4×4 video sample every 300ms gently updates its colour; a CORS sampling failure retains a static glow. This is an approximation, not ray-traced global illumination. Video textures are disposed independently of the shared poster cache.

## Camera and navigation

One imperative OrbitControls instance owns manual navigation. A single R3F frame callback performs the camera update; input damping uses delta time, with a delta cap on resumed tabs. New camera commands drain residual input and replace the old transition. Smoothstep paths rise to a safe clearance height, traverse the room, and descend into the selected view. Reduced-motion users move directly to the destination. Starting a drag, zoom or pan cancels tour/preset motion and selects Free view. Availability polling and selected-seat colour changes do not issue camera commands.

Blueprint-derived routes contain six views for the compact Lounge, nine for Studio, and ten including the Grand balcony. Arrows loop consistently. Keyboard arrows operate only while the viewport or canvas itself has focus. Named presets, selection and the 2D fallback remain available. My view uses the selected seat's eye position, provides a selector for other chosen seats, and offers Return to auditorium.

Room bounds protect walls, ceiling, floor and the screen. Manual movement is swept in 15cm increments against seat cushion/back/arm volumes and the balcony rail to prevent large wheel deltas tunnelling through them. Collision detection covers the built-in procedural geometry. A future arbitrary GLB with additional internal obstacles will need matching collision volumes; its visual model alone cannot establish safe navigation.

## Visuals and performance

Seats use instanced contoured cushions, lumbar/head pads, rear shells, arms, metal supports, cup-holder rims and piping. Recliners add footrests, taller cushions and a separate leather-like physical material. Availability updates instance colours; camera movement never changes seat transforms. Selected seats keep clear mint upholstery, floor rings and labels.

Shared 2K CC0 normal/roughness maps provide fine upholstery detail without the previous checked diffuse pattern. Texture transforms are isolated per surface and disposed on release. Wood and carpet retain albedo/normal/roughness maps and up to 16× anisotropy. Architecture adds acoustic panels, panel reveals, sconces, ceiling coffers, recessed fixtures, side stair flights and differentiated curtain palettes. House lights fade over time. Only the principal light casts a cached shadow map; video glow and fill lights do not require shadow redraws.

Desktop DPR is capped at 1.75; mobile/low-memory devices start at up to 1.25. Low-memory devices disable shadow mapping. Sustained low frame rate lowers DPR to 1 and disables shadow mapping once without oscillation. The quality toggle and accessible 2D map remain available. Geometry is procedural rather than downloaded GLB; GLB/KTX2 compression is therefore not claimed. This is an improved illustrative auditorium, not a verified architectural digital twin or a claim of offline-renderer photorealism.

## Reproducible checks

`npm run typecheck`, `npm test`, and `npm run test:e2e` cover the existing booking system plus source failure, actual 1080p/720p decode, custom controls, HLS playback, selection retention, camera arrows, free view, physical-screen configuration and mobile overflow. `tests/fixtures/hls` contains an eight-second 360p Sintel excerpt, transcoded solely for HLS tests under the same CC BY 3.0 attribution. It is never substituted for catalog trailers. Visual captures in ignored `outputs/video-qa` inspect overview, close seat, stage, front, balcony and mobile views. Chromium software rendering validates behaviour but is not a representative hardware-GPU frame-rate benchmark.
