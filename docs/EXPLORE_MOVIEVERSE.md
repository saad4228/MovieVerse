# Movies and Explore

`/movies` is the cinema destination. It reads the same city-specific, future-screening and inventory-aware endpoint as the booking-focused homepage carousel. Current inventory is explicitly simulated. National TMDB Now Playing membership never creates city showtimes.

`/explore` is the global discovery destination. It reuses the existing D1 catalogue, TMDB integration, poster cards, Watchlist, horizontal rails and genre pages. Collections load as they approach the viewport. View All opens a paginated catalogue with title search, language, genre, production country, year, rating and sorting controls. Discovery cards say Explore movie, rather than implying that every catalogue film can be booked.

Collections include US-origin Hollywood, Hindi Indian cinema, four separate South Indian language collections, international co-productions, audience-rated favourites, pre-2000 Hollywood classics, recent releases and upcoming regional releases. Country and language remain distinct. Recent regional collections query the past twelve months of Indian theatrical release dates; international recent dates are explicitly global. Upcoming language collections require future Indian release dates and active upcoming membership. No movies are duplicated or manufactured. Empty collections remain honestly empty until source data arrives.

Explore and Watchlist are now in the shared desktop/mobile navbar. A compact homepage Explore promotion preserves the existing booking-focused sections. Existing account, tickets, search and city controls remain available. Movie detail artwork now uses edge-to-edge cover fitting, without changing hero height or content placement; natural cropping replaces empty side gutters.

## Automatic refresh

The existing sync pipeline and source schedules are reused: full refresh at 03:00 UTC daily and trending every six hours. Existing imports contained approximately 1,600 unique movies before this change; this task did not run another import or claim a new import count. Movies leaving a rolling collection remain stored and discoverable.

Production still needs the actual D1 binding, migrations, Worker secret and deployed schedules. Production scheduled execution has not been verified. See `DYNAMIC_CATALOGUE.md` for the existing deployment and local scheduled-execution limitation. This change does not claim that a configured local token proves production automatic updates work.

## Main files

- `components/ExplorePage.tsx`, `components/explore.css`: Explore landing, lazy collections and city cinema Movies page.
- `lib/explore-collections.ts`: shared collection presentation.
- `lib/catalogue-read.ts`: date-aware recent and regional upcoming queries.
- `components/Discovery.tsx`: paginated Explore catalogue and filters.
- `components/Navigation.tsx`, `components/MovieVerse.tsx`, `components/Home.tsx`: routes and entry points.
- `components/movie-detail-polish.css`: hero artwork cover fitting.

## Checks

`tests/e2e/explore-separation.spec.ts` checks cinema/discovery separation, actual collection responses, navbar links and desktop/mobile overflow. `tests/e2e/movie-experience-refinements.spec.ts` checks the existing booking carousel and cover-fitted movie heroes on both viewport sizes. `tests/dynamic-catalogue.test.ts` checks date-window filtering, regional upcoming membership and record retention. Screenshots are saved in `outputs/explore-desktop.png`, `outputs/explore-mobile.png` and the existing movie-banner outputs.
