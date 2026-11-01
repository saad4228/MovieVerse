# Cinema coverage and evidence

Reviewed: **1 November 2026**. The review date records when sources were checked, not the date a cinema was independently confirmed to be operating.

## Coverage

`data/cinema-venues.json` contains **108 distinct venues in 10 cities**. This is a curated directory, not an exhaustive or live cinema inventory.

| City | Records |
|---|---:|
| Nagpur | 18 |
| Chennai | 10 |
| Mumbai | 10 |
| Delhi | 10 |
| Bengaluru | 10 |
| Hyderabad | 10 |
| Pune | 10 |
| Kolkata | 10 |
| Ahmedabad | 10 |
| Jaipur | 10 |

**107 records are `listed`; one is `uncertain`. All 108 have `operationalStatus: unconfirmed`.** A public listing establishes an identifiable venue, but can survive a closure or rebrand. No record claims independent current operational verification. Empty formats or amenities mean “not established from the checked evidence”, not “unavailable”.

Addresses intentionally use verified locality/street information instead of guessed postal codes, full building addresses or coordinates. Branch names identify the mall or station separately. No coordinates have been inferred.

## Nagpur priority audit

All 17 requested candidates are represented; Goyal Talkies is an additional publicly listed venue. Five AM branches have separate records. Skylight and Sangam are one record with aliases.

| Canonical venue | Evidence and treatment |
|---|---|
| Cinepolis — VR Nagpur Mall | BookMyShow and District; Rambagh Road. District lists parking, food and air conditioning. |
| MovieMax — Eternity Mall | BookMyShow and District; Sitabuldi. Cinemax retained as historical alias. District lists Dolby 7.1, recliners and other facilities. |
| Skylight (Sangam) Cinema | BookMyShow names the combined venue. Sangam Cinecosmo, Sangam Cinema and Skylight aliases deduplicate to this record. |
| INOX — Jaswant Tuli Mall | BookMyShow and District; Kamptee Road. PVR INOX alias retained. |
| AM Cinema — Manish Nagar | Operator site and BookMyShow; Jayanti Nagri 5 Mall, Besa Road. |
| AM Cinema Iconic — Besa | Operator site and BookMyShow; Jayanti Nagri VII, Besa–Pipla Road. |
| AM Cinema — Jaiprakash Nagar | Operator site and BookMyShow; metro station on Wardha Road. Wardha Road / Rajiv Nagar aliases attached. |
| AM Cinema — Koradi | Operator site and BookMyShow; New Nanda, Koradi in the wider Nagpur area. |
| AM Cinema — Bansi Nagar | Operator site and BookMyShow; Bansi Nagar Metro Station. |
| Buty Cineplex — Sadar | BookMyShow and District; Mount Road Extension. Distinct from Liberty. |
| Liberty Cinema — Sadar | BookMyShow; Residency Road. Distinct from Buty. |
| Kamal Cineplex | BookMyShow and District; Kamal Talkies alias. District lists wheelchair access and parking. |
| Janki Theatre | BookMyShow; Sitabuldi. Listing explicitly names 2K Laser and Dolby 5.1. |
| Panchsheel Cinema | BookMyShow; New Ramdaspeth. |
| Cine Chourangi — Khapri | BookMyShow; Shankarpur Road, New Khapri. |
| Jayshree Cineplex | BookMyShow; Ganeshpeth. Jayshree Talkies alias retained. |
| PVR — Empress City Mall | **Uncertain, not bookable.** Legacy directory listing conflicts with secondary closure reports; no operator confirmation obtained. |
| Goyal Talkies — Kamptee | Additional BookMyShow listing. Explicitly identified as Kamptee in the wider Nagpur area. |

### Nagpur sources and conflicts

- [AM Cinema operator site](https://amcinema.in/) lists all five AM branches. Some outgoing booking links contained inconsistent city slugs, so the operator homepage is retained as the discovery link instead of importing those links as showtime evidence.
- [BookMyShow Nagpur directory](https://in.bookmyshow.com/nagpur/cinemas) lists the 17 non-Empress venues above. Its public region includes Koradi and Kamptee. Those locations are explicit in the records.
- The operator and BookMyShow disagree on the Iconic Besa postal code; the dataset omits the postal code rather than choosing one without evidence.
- [District Nagpur directory](https://www.district.in/movies/cinemas-in-nagpur) corroborates five venues. Individual references: [MovieMax](https://www.district.in/movies/moviemax-eternity-nagpur-CD27031), [Cinepolis](https://www.district.in/movies/cinepolis-vr-nagpur-mall-rambagh-road-nagpur-CD24782), [INOX](https://www.district.in/movies/inox-jaswant-tuli-mall-kamptee-road-nagpur-CD1029912), [Buty](https://www.district.in/movies/buty-cineplex-sadar-nagpur-CD1014900), [Kamal](https://www.district.in/movies/kamal-talkies-panchpaoli-road-nagpur-CD913).
- District responses included dated October 2026 schedules and, for MovieMax, a 1 November date choice. Some responses were cached. These do not establish a complete live schedule, seat inventory or operational guarantee, and no showtimes were imported.
- [Justdial's Nagpur directory](https://www.justdial.com/Nagpur/Cinema-Halls/nct-10099752) retains Empress and other historical names. [Wanderlog's Empress listing](https://wanderlog.com/place/details/11231980/pvr-cinemas-empress-mall-nagpur) marks closure, and a [November 2023 community report](https://www.reddit.com/r/nagpur/comments/188uf4x) discusses closure. These are secondary evidence. Absence from the checked BookMyShow directory is not itself proof of closure. Empress is therefore retained as uncertain/unconfirmed, without a booking link, rather than silently deleted or advertised as active.

## Other nine cities

The pre-existing `data/cinema-directory.json` was used as a discovery reference. Its names were not promoted to verified records merely because they already existed. The following public city directories were checked to select ten identifiable venues per city:

| City | Checked directory |
|---|---|
| Chennai | [BookMyShow Chennai](https://in.bookmyshow.com/chennai/cinemas) |
| Mumbai | [BookMyShow Mumbai](https://in.bookmyshow.com/mumbai/cinemas) |
| Delhi | [BookMyShow Delhi](https://in.bookmyshow.com/delhi/cinemas) |
| Bengaluru | [BookMyShow Bengaluru](https://in.bookmyshow.com/bengaluru/cinemas) |
| Hyderabad | [BookMyShow Hyderabad](https://in.bookmyshow.com/hyderabad/cinemas) |
| Pune | [BookMyShow Pune](https://in.bookmyshow.com/pune/cinemas) |
| Kolkata | [BookMyShow Kolkata](https://in.bookmyshow.com/kolkata/cinemas) |
| Ahmedabad | [BookMyShow Ahmedabad](https://in.bookmyshow.com/ahmedabad/cinemas) |
| Jaipur | [BookMyShow Jaipur](https://in.bookmyshow.com/jaipur/cinemas) |

Selection avoids automatically importing all regional directory entries: Delhi results include Noida/Gurugram; Mumbai results include Thane/Navi Mumbai; Ahmedabad includes Gandhinagar. Those out-of-city results were excluded from these city samples. Nagpur's explicitly requested regional venues are retained and labelled.

Only formats explicitly associated with an individual listing were recorded. A platform's global IMAX/4DX/Atmos navigation is not evidence that every listed cinema supports those formats. Prasads' historical branding or nearby IMAX Road is not treated as proof of a current IMAX auditorium.

## Integration contract

- IDs are stable, descriptive and unique. Branches remain separate; aliases do not create extra venue records.
- `source` is the venue/operator or city-directory evidence URL. `bookingUrl` is a discovery destination, not a claim that a selected movie is showing there.
- `verification: listed` and `operationalStatus: unconfirmed` must not be rendered as “verified operating”.
- Directory presence does not establish a movie/theatre/date match. Demo schedules must remain labelled as demo schedules; real availability requires a live provider response.
- No seat inventory, price, live occupancy, auditorium dimensions or actual building model is supplied by this directory.
- An eventual verified provider can update records and operational status independently of the 3D rendering engine.

