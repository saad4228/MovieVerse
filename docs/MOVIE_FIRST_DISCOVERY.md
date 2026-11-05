# Movie-first showtime discovery

Implemented in the existing movie detail booking section (`#showtimes`); the cinema-first flow, movie information, navbar rules and booking backend remain intact.

## Application files

- `components/MovieShowtimes.tsx`: dynamic movie/city header and movie artwork; global Zustand city selection; seven India-local dates; listing-derived language, format, price and amenity filters; time and availability filters; search and deterministic sorts; inventory-aware comparison links; horizontal venue rows and show tiles.
- `components/movie-showtimes.css`: scoped cinematic styling, responsive date/city strips, mobile collapsible filters, stacked venue rows, touch targets, focus states and reduced-motion handling.
- `components/Discovery.tsx`: delegates movie-first discovery to the new component, preserves cinema-first discovery, keeps discovery accessible when the current city has no demo shows, and avoids resetting compatible filters on city changes.

## Data and booking boundaries

- All movie artwork, cities, venues, amenities, prices and screening identities come from the existing catalogue/provider.
- The date horizon remains seven days because the existing provider only supports those dates; no unsupported calendar dates are offered.
- No measured user location is available. Illustrative distance values are not displayed or used for nearest sorting.
- Comparison links use checked demo seat summaries, with labels describing their basis. They are omitted when availability cannot be verified. No invented overall quality ranking, live inventory or venue ratings.
- Request cancellation and identity matching prevent stale city/date availability from being rendered. Failed summary requests leave inventory explicitly unverified; sold-out shows are disabled.
- The existing screening ID is passed unchanged to `setShow` and `/booking/:id/seats`. Backend inventory resolves movie, venue, auditorium, blueprint, date, time, language and format from that ID.
- Sourced cinema directory and external operator links remain separate from illustrative venues and simulated inventory.

## Verification

- Eight browser tests passed: six new discovery tests plus both existing movie-first and cinema-first booking journeys.
- Covered global/navbar city synchronization, compatible filter persistence, language/format filters, price/show-count sorting, sold-out and failed-inventory states, exact screening identity into the existing 3D scene, and 1440/768/390px layouts without horizontal overflow.
- Existing movie-first journey verified simulated payment failure/retry, successful confirmation, QR visibility, ticket download and cancellation/history.
- TypeScript check passed; 73 unit tests passed.
- Browser screenshots: `outputs/movie-discovery-{1440,768,390}.png` and `outputs/movie-discovery-rows-{1440,768,390}.png`.

This UI does not activate a live cinema ticketing provider or real payments. Availability remains explicitly labelled demo or unverified.
