# Genre discovery

The Movies page has a lazy-loaded `Explore by Genre` section using the existing MovieVerse poster cards and horizontal rail controls. The catalogue resolves all genre IDs from TMDB's movie genre configuration at runtime. The 15 collections are Action, Science Fiction, Adventure, Thriller, Horror, Romance, Comedy, Drama, Crime & Mystery, Fantasy, Animation, Family & Kids, History & War, Music & Musicals, and Documentary. Multi-genre films keep one `tmdb-ID` identity across rails.

## Data and loading

- The preview loader fetches three provider pages for each genre as its rail approaches the viewport: broad popular, India-origin popular, and top-rated. It interleaves and deduplicates by TMDB ID, returning up to 30 titles per rail. Thus each section can represent international and Indian films without assuming that a language identifies a production industry.
- The live TMDB check on 2026-11-04 returned 30 films in each of the 15 previews, with 279 distinct IDs across those first previews. Those are live provider results, not a hardcoded catalogue. Counts vary as TMDB changes.
- `View all` opens `/genres/:slug`. Results are fetched 20 at a time, with previous/next pagination, title search, provider sort, original-language, country-of-origin and release-year filters. Region and language remain separate. Search verifies country against movie details for the current result page, at most four detail requests concurrently.
- The server TMDB helper caches discovery pages for 15 minutes, genre configuration for 24 hours, and movie details for one hour; it coalesces concurrent requests and keeps credentials server-side. The browser caches query results for five minutes and shares canonical movie objects across genre rails.
- Posters use TMDB's image CDN and the existing poster fallback. Detail pages use the existing live metadata component. A discovered title only links to the existing screening flow when its TMDB ID matches a movie with a current city screening; otherwise the page says “Not currently screening in your city.”
- The browse page also keeps the existing now-showing and coming-soon experience. Genre discovery is not used as cinema inventory and does not create showtimes or bookable tickets.

## Verification and limits

- TMDB genre configuration and all 15 preview queries were fetched successfully using the configured server credential via the existing server adapter on 2026-11-04. The credential value was not logged or returned.
- The local Cloudflare Vite Worker could load the token, but its outbound `fetch` to TMDB failed in this environment. A direct request through the same server adapter's Node test runtime succeeded. Therefore the browser preview was verified with fixture responses; the app's browser-to-local-Worker live path could not be confirmed here. The deployed Worker needs outbound HTTPS access to `api.themoviedb.org`.
- Dynamic genre API tests cover provider IDs, multiple-genre identity, filters, country verification, adult-title exclusion, pagination validation, caching, missing credentials and missing genres. Playwright covers all 15 rows, independent rail navigation, filters, details, city persistence, mobile layout and unavailable credentials.
- Some genre categories combine TMDB IDs with OR semantics (Crime + Mystery, History + War); a film may therefore occur in more than one collection. Search is constrained to each provider page, so it may need pagination to find a matching title.
- TMDB's own genre taxonomy does not identify industry brands such as “Hollywood” or “Bollywood.” The interface uses country-of-origin and language filters independently rather than asserting that US origin or Hindi language alone proves those labels. TMDB data use remains subject to its attribution and applicable licensing terms.

TMDB references: [Discover movies](https://developer.themoviedb.org/reference/discover-movie), [Movie genres](https://developer.themoviedb.org/reference/genre-movie-list), [API terms](https://www.themoviedb.org/api-terms-of-use).
