# Data sources and integration boundaries

Reviewed 1 November 2026.

## Movie information and imagery

`data/movie-details.json` contains 18 TMDB-ID matched movie records, 123 cast credits and 114 distinct cast portrait sources. Source URLs and checked dates are stored per film. Priority stories are spoiler-conscious paraphrases. TMDB is community maintained; these are sourced records, not independently studio-certified facts. Unknown details are explicitly unconfirmed.

`data/media-catalog.json` and `data/image-audit.json` preserve dimensions, candidate artwork, selection notes, attribution and alternatives. Nine films have curated landscape artwork with responsive 1280-pixel versions. Priority delivered dimensions: Leo 2846×1599, Vikram 2443×1375, Thug Life 3840×2160, Coolie 3840×2160, Toxic 3839×2160. Correct movie IDs distinguish Vikram (2022, Kamal Haasan) from similarly named films. No thumbnail enlargement is used.

`data/catalog-asset-cache.json` maps 129 source URLs to optimised local WebP files, preserving original and delivered dimensions. It includes actor portraits and additional catalogue artwork. `scripts/cache-catalog-assets.mjs` refreshes this cache without enlargement. `scripts/sync-hd-media.mjs` supports targeted curated backdrop updates. Public image availability does not grant a commercial redistribution licence; attribution and rights-holder terms remain applicable.

Optional server-only `TMDB_READ_TOKEN` enables the cached metadata adapter. Without a credential, sourced bundled metadata remains functional. API credentials never enter client responses. Successful server responses are cached for 24 hours; provider failures retry after one minute. Movie detail responses use a five-minute browser cache with stale-while-revalidate. Official API documentation: https://developer.themoviedb.org/reference/movie-credits and https://developer.themoviedb.org/reference/movie-images .

## Releases and trailers

Release dates are market-specific and compared with the current India calendar date. An unavailable Indian date is never replaced with a US date. Avengers: Doomsday: India 17 December 2026 (Variety India announcement and TMDB); US 18 December 2026 (Disney). Sources: https://movies.disney.com/avengers-doomsday and the per-record links in `data/movie-details.json`.

`data/trailer-sources.json` is the configurable trailer registry. New entries include official Disney Doomsday trailer/special-look links and official Thug Life Tamil/Hindi trailer links. Commercial trailer links remain external where permitted direct video sources are unavailable. No YouTube media extraction, iframe projection or restriction bypass is used.

Sintel's authorised bundled MP4 variants and test HLS fixture exercise actual HTML5 video and Three.js VideoTexture. Commercial films use matching artwork on the physical screen plus their official external trailer link. A direct source can be supplied through the existing validated catalog configuration without altering the renderer.

## Cinema discovery and bookings

`data/cinema-venues.json` contains 108 sourced records in ten cities, including 18 Nagpur venues and five distinct AM branches. See CINEMA_COVERAGE.md for evidence and aliases. 107 are source-listed, Empress is uncertain, and current operating status is unconfirmed for every venue. This directory is not live screening inventory or a claim of exhaustive city coverage.

Public operator, BookMyShow, District and directory pages were used as research references. No restricted ticketing APIs were queried. Live inventory requires an authorised operator endpoint configured through `LIVE_SHOWTIMES_ENDPOINT` and optional `LIVE_SHOWTIMES_TOKEN`. The adapter validates city, movie and date, and only claims completeness when the provider explicitly supplies it.

Interactive bookings use distinctly labelled demo venues, schedules, seats and test payments. Availability summaries are read from persisted D1 inventory; unopened inventories report unknown. Expired holds are counted as available. Real venue records never create synthetic screenings.
