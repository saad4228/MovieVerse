# Expansion testing report

Date: 1 November 2026. Environment: Windows, local Vinext/Workers/D1, Chromium with software WebGL for auditorium tests.

## Scope and evidence

Type checking passes. Unit tests cover booking math and seat grouping, auditorium geometry/collision/quality, movie media fallback, authorised listing boundaries, catalogue schemas, carousel nearest-index geometry, regional release rollover, exact actor portrait mapping, Nagpur branch identity, image ranking, explicit auditorium scheduling and old-catalogue upgrades.

Browser coverage includes slow and fast multi-poster drags, reverse direction, side-poster clicks, autoplay pause/resume, reduced motion, responsive layouts, regional dates, cast image decoding, cinema branch search, stored inventory summaries, independent session holds, payment failure recovery, snacks, QR tickets, history and account isolation.

Video tests exercise decoded 1080p MP4, quality switching, failed-source fallback, actual HLS decoding, the physical Three.js VideoTexture, continuous playback during camera movement and inventory refresh, seat perspective, camera arrows and the 2D alternative. Commercial films are checked for matching artwork and an official external link with no iframe or floating projected video. No commercial direct stream is claimed to have been tested without a permitted source.

## Findings resolved during validation

1. An older persisted administrator catalogue excluded new films. A versioned, non-destructive catalogue upgrade now merges introduced IDs while preserving customised entries and later intentional deletions.
2. AM Cinema search also matched the suffix of Sangam Cinema. Search now matches at word boundaries; five AM branches and the single Sangam alias record remain distinct.
3. Responsive artwork covered the old background gradient. The scrim now belongs to the artwork layer, restoring text contrast on bright promotional art.
4. Repeated camera-preset timeouts exposed frame-count-based transition timing and capped diagnostic updates on slow software rendering. Transitions now use wall-clock elapsed time, and position diagnostics use actual frame duration. Both camera regressions passed after this fix without increasing the assertion timeout.

## Visual inspection

Manually reviewed rendered 1440×900 Leo, Vikram, Thug Life, Coolie and Toxic pages and the Leo cast/crew section. Checked correct film association, composition, actual source dimensions and image decode; inspection was not limited to HTTP status. Desktop evidence is in `outputs/expansion-qa/`. Mobile directory evidence is `outputs/expansion-mobile-directory.png`. The image-ingestion audit retains alternate candidates and notes. Bright artwork received the additional readability scrim after this review.

## Limits

No live ticketing credential, real cinema operational verification, commercial direct-video licence, real payment provider or measured theatre blueprint was supplied. Real-device GPU performance, Safari/iOS autoplay and external provider production contracts remain outside this local Chromium run. Unknown data stays visibly unknown; directory size is never presented as live bookable coverage.

## Final local results

- TypeScript: passed.
- Vitest: 33 tests passed in four files.
- Playwright: all 19 scenarios verified. The final complete suite passed 18/19; after correcting camera timing, the failing camera scenario and the separate continuous-playback/camera scenario both passed in a targeted rerun (2/2). The complete suite was not rerun after that targeted fix.
- Production build: passed through the Sites build helper.
