import type { Movie, Venue } from "./catalog";
import { regionalRelease } from "./movie-information";
import evidence from "../data/discovery-evidence.json" with { type: "json" };

export type ListingEvidence = { movieId: string; cityId: string; screeningDate: string; verifiedAt: string; expiresAt: string; bookingUrl: string; sourceUrl: string; kind: "external"; venueNames?: string[] };
export type DiscoveryStatus = "now-showing" | "advance-booking" | "coming-soon" | "released" | "unconfirmed";
export const indiaDate = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export function externalListings(movieId: string, cityId: string, now = new Date(), records = evidence as ListingEvidence[]) {
  const today = indiaDate(now);
  return records.filter(r => r.movieId === movieId && r.cityId === cityId && r.screeningDate >= today &&
    Date.parse(r.verifiedAt) <= now.getTime() && Date.parse(r.expiresAt) > now.getTime() && /^https:\/\//.test(r.bookingUrl));
}
export function demoAvailable(movie: Movie, cityId: string, venues: Venue[], now = new Date()) {
  const today = indiaDate(now);
  const last = indiaDate(new Date(now.getTime() + 6 * 86400000));
  const release = regionalRelease(movie)?.date;
  return venues.some(v => v.cityId === cityId && v.movieIds.includes(movie.id) &&
    (!v.screenings ? (!release || release <= last) : v.screenings.some(s => s.movieId === movie.id &&
      (!s.date || (s.date >= today && s.date <= last && (!release || s.date >= release))))));
}
/** Popularity never supplies local availability. Foreign dates never stand in for India. */
export function discoveryStatus(movie: Movie, cityId: string, venues: Venue[], now = new Date(), records?: ListingEvidence[]): DiscoveryStatus {
  const release = regionalRelease(movie, "IN");
  const today = indiaDate(now);
  const external = externalListings(movie.id, cityId, now, records).filter(r => !release?.date || r.screeningDate >= release.date);
  const demo = demoAvailable(movie, cityId, venues, now);
  if (!release?.date || release.status === "unconfirmed") return demo || external.length ? "now-showing" : "unconfirmed";
  if (release.date > today) {
    // Explicit dated screenings are required to advertise advance booking.
    const advanceDemo = venues.some(v => v.cityId === cityId && v.movieIds.includes(movie.id) && v.screenings?.some(s =>
      s.movieId === movie.id && s.date && s.date >= today && s.date >= release.date! && s.date <= indiaDate(new Date(now.getTime() + 6 * 86400000))));
    return external.length || advanceDemo ? "advance-booking" : "coming-soon";
  }
  return demo || external.length ? "now-showing" : "released";
}
export function discoverySections(movies: Movie[], cityId: string, venues: Venue[], now = new Date()) {
  const statuses = new Map(movies.map(m=>[m.id,discoveryStatus(m,cityId,venues,now)]));
  const by = (status: DiscoveryStatus) => movies.filter(m => statuses.get(m.id) === status);
  const cityPicks = movies.filter(m => ["now-showing", "advance-booking"].includes(statuses.get(m.id)!));
  return {
    showing: by("now-showing"), advance: by("advance-booking"),
    released: by("released"),
    coming: by("coming-soon").sort((a,b) => (regionalRelease(a)?.date || "").localeCompare(regionalRelease(b)?.date || "")),
    trending: cityPicks.slice(0, 8),
    regional: cityPicks.filter(m => m.languages.some(l => !["Hindi", "English"].includes(l))),
  };
}
export function movieMatches(movie: Movie, query: string) {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const catalog = normalize([movie.title, ...(movie.aliases || []), ...movie.languages, ...movie.genre,
    ...(movie.metadata?.cast.map(person => person.name) || []), ...(movie.metadata?.crew.map(person => person.name) || [])].join(" "));
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return terms.every(term => catalog.includes(term));
}

/** Global search includes the app's local/demo titles as well as the catalogue.
 * Metadata-provider absence must not make a bookable local record unfindable. */
export function searchMovieRecords(remote: Movie[], local: Movie[], query: string) {
  const records: Movie[] = [];
  const identities = new Map<string, number>();
  for (const movie of [...remote, ...local]) {
    if (!movieMatches(movie, query)) continue;
    const id = `id:${movie.id}`;
    const tmdbId = movie.metadata?.tmdbId;
    const tmdb = tmdbId ? `tmdb:${tmdbId}` : undefined;
    const existing = identities.get(id) ?? (tmdb ? identities.get(tmdb) : undefined);
    const index = existing ?? records.length;
    records[index] = movie;
    identities.set(id, index);
    if (tmdb) identities.set(tmdb, index);
  }
  return records;
}
