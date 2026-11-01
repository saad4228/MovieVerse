# Movie metadata provenance

Checked 1 November 2026.

The catalogue contains 18 detailed movie records: the original nine, Thug Life, and eight additional anticipated films. The additions file includes released Thug Life intentionally; consumers must filter by status instead of assuming every record is upcoming.

## Sources and method

Movie IDs, cast identities, character credits, crew credits and original poster/backdrop paths were read from each public TMDB movie page and full credits page. Cast profilePath values are actual image paths obtained from the same person block as the numeric person ID. Resolve them against https://image.tmdb.org/t/p/w342. A null profilePath means no portrait was available; never substitute an unrelated actor. Each record includes its exact source links. TMDB is community maintained, so these records are sourced catalogue metadata rather than studio certification.

Overviews are original spoiler-conscious paraphrases, not copied descriptions. Upcoming plots are limited to disclosed premises; Spirit and Tumbbad II explicitly state that a detailed verified synopsis was unavailable. Unannounced cast roles are labelled accordingly. Crew lists contain the credited director, writer/screenplay/story, producer, composer and cinematographer where supplied. Unavailable credits and production-company data remain absent rather than invented.

## Release-date handling

Dates are regional. TMDB movie-page regional dates were used for IN records, linked to the release-date page for review. These should be refreshed before production use; a movie date does not establish that a cinema currently has a screening.

Avengers: Doomsday has India 17 December 2026 and US 18 December 2026 as separate records. Disney's official US page independently supports the US date: https://movies.disney.com/avengers-doomsday . The India announcement is also reported at https://varietyindia.com/avengers-doomsday-to-release-in-india-on-december-17-a-day-before-us-robert-downey-jr-and-chris-evans-share-diwali-wishes/ .

Hexed's 25 November 2026 date is US only; no Indian release date has been inferred. Disney's fall calendar: https://thewaltdisneycompany.com/news/disney-movies-theaters-fall-2026/ .

Spirit, Richard Anthony and Kathanar deliberately have no display release date: a sufficiently reliable regional announcement was not independently confirmed for this update. Spirit has a date on its community TMDB page, but this has not been promoted to a confirmed announcement.

As of the checked date, the existing titles Toxic and Jailer 2 have past dates in TMDB, so their details mark those regional dates released. This does not verify present theatrical availability. Varanasi's catalogue date is 7 April 2027; Ramayana: Rise of a Legend is 5 November 2026.

## Media and completeness

Thug Life uses local compatibility asset paths so the media resolver can select the curated HD files. The remote original URLs were checked before that substitution.

New entries have no fabricated ratings, vote counts, runtimes, certificates, formats or trailers. Zero duration/rating represents unknown, not a real measured value. Posters and backdrops use verified original TMDB image paths. Tumbbad II currently has only a poster in the fetched metadata; its backdrop intentionally falls back to that poster and should be framed rather than stretched. Movie artwork and performer portraits remain subject to their owners' rights and TMDB attribution requirements; public URL accessibility is not a reuse licence.

Validation: parsed both JSON documents; checked all 18 additional poster/backdrop URLs and a sample of 12 cast-profile URLs via HTTP HEAD. Results: all responded successfully. There are 114 distinct cast portrait paths.

## Catalogue source index

- coolie: https://www.themoviedb.org/movie/1153399 ; credits: https://www.themoviedb.org/movie/1153399/cast
- leo: https://www.themoviedb.org/movie/949229 ; credits: https://www.themoviedb.org/movie/949229/cast
- vikram: https://www.themoviedb.org/movie/743563 ; credits: https://www.themoviedb.org/movie/743563/cast
- varanasi: https://www.themoviedb.org/movie/920708 ; credits: https://www.themoviedb.org/movie/920708/cast
- toxic: https://www.themoviedb.org/movie/1213243 ; credits: https://www.themoviedb.org/movie/1213243/cast
- jailer-2: https://www.themoviedb.org/movie/1234139 ; credits: https://www.themoviedb.org/movie/1234139/cast
- ramayana: https://www.themoviedb.org/movie/656908 ; credits: https://www.themoviedb.org/movie/656908/cast
- war-2: https://www.themoviedb.org/movie/1109086 ; credits: https://www.themoviedb.org/movie/1109086/cast
- sintel: https://www.themoviedb.org/movie/45745 ; credits: https://www.themoviedb.org/movie/45745/cast
- thug-life: https://www.themoviedb.org/movie/1045021 ; credits: https://www.themoviedb.org/movie/1045021/cast
- avengers-doomsday: https://www.themoviedb.org/movie/1003596 ; credits: https://www.themoviedb.org/movie/1003596/cast
- dune-part-three: https://www.themoviedb.org/movie/1170608 ; credits: https://www.themoviedb.org/movie/1170608/cast
- spirit: https://www.themoviedb.org/movie/881903 ; credits: https://www.themoviedb.org/movie/881903/cast
- hexed: https://www.themoviedb.org/movie/1538497 ; credits: https://www.themoviedb.org/movie/1538497/cast
- angry-birds-3: https://www.themoviedb.org/movie/1300926 ; credits: https://www.themoviedb.org/movie/1300926/cast
- richard-anthony: https://www.themoviedb.org/movie/849546 ; credits: https://www.themoviedb.org/movie/849546/cast
- kathanar: https://www.themoviedb.org/movie/1109369 ; credits: https://www.themoviedb.org/movie/1109369/cast
- tumbbad-2: https://www.themoviedb.org/movie/1356563 ; credits: https://www.themoviedb.org/movie/1356563/cast
