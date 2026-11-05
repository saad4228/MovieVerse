import records from "../data/movie-details.json" with { type: "json" };
import discoveryRecords from "../data/discovery-movies.json" with { type: "json" };
import type { Movie } from "./catalog";
import {cachedAsset} from "./asset-cache";

export type PersonCredit = { id?: number; name: string; character?: string; job?: string; profilePath?: string | null; backupProfilePath?: string | null };
export type ReleaseInformation = { region: string; date: string | null; status: "announced" | "released" | "unconfirmed"; source: string };
export type MovieInformation = {
  tmdbId?: number; overview: string; story?: string; cast: PersonCredit[]; crew: PersonCredit[];
  production: string[]; releaseDates: ReleaseInformation[]; sources: string[]; checked: string;
  backdropPosition?: string;
};
const knownPeople = [...Object.values(records).flatMap(r => [...r.cast, ...r.crew]), ...discoveryRecords.flatMap(m=>m.metadata.cast)] as PersonCredit[];
export function bundledInformation(id: string): MovieInformation | undefined {
  return (records as unknown as Record<string, MovieInformation>)[id] || discoveryRecords.find(m=>m.id===id)?.metadata as MovieInformation | undefined;
}
export function enrichMovieInformation(movie: Movie): Movie {
  const bundled = bundledInformation(movie.id);
  const metadata = movie.metadata && bundled ? {...movie.metadata,cast:movie.metadata.cast.map(p=>{
    const source=bundled.cast.find(c=>p.id && c.id ? p.id===c.id : p.name===c.name);
    return {...p,character:p.character || source?.character,profilePath:p.profilePath || source?.profilePath};
  })} : movie.metadata || bundled;
  return metadata ? { ...movie, metadata: normalizeInformation(metadata) } : movie;
}
/** Portraits belong to people; character credits belong only to this movie.
 * Resolve only unambiguous identities already present in sourced records. */
export function normalizeInformation(info: MovieInformation): MovieInformation {
  const normalize = (credits: PersonCredit[], crew = false) => {
    const result = new Map<string, PersonCredit>();
    for (const person of credits) {
      const matches = knownPeople.filter(p => person.id ? p.id === person.id : p.name.trim().toLowerCase() === person.name.trim().toLowerCase());
      const ids = new Set(matches.map(p => p.id).filter(Boolean));
      const profiles = new Set(matches.map(p=>p.profilePath).filter(Boolean));
      const portrait = ids.size === 1 || (!person.id && ids.size===0 && profiles.size===1) ? matches.find(p => p.profilePath) : undefined;
      const resolved = { ...person, id: person.id || portrait?.id, profilePath: person.profilePath || portrait?.profilePath };
      const key = `${resolved.id || resolved.name.trim().toLowerCase()}${crew ? ':' + person.job : ''}`;
      const previous = result.get(key);
      result.set(key, previous ? {...resolved, character: previous.character || resolved.character, profilePath:previous.profilePath || resolved.profilePath} : resolved);
    }
    return [...result.values()];
  };
  return {...info, cast:normalize(info.cast), crew:normalize(info.crew,true)};
}
export function regionalRelease(movie: Movie, region = "IN") {
  const info = movie.metadata || bundledInformation(movie.id);
  if (info) return info.releaseDates.find(r => r.region === region && r.date && r.status !== "unconfirmed") || null;
  return movie.release ? { region, date: movie.release, status: "unconfirmed" as const, source: "Demo catalog" } : null;
}
export function releaseState(movie: Movie, region = "IN", today = new Date().toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"}), screenings = false) {
  const release = regionalRelease(movie, region);
  if (release?.date && release.status !== "unconfirmed") {
    if (release.date > today) return (Date.parse(release.date) - Date.parse(today)) / 86400000 <= 30 ? "releasing-soon" : "upcoming";
    return screenings ? "now-showing" : "released";
  }
  const info = movie.metadata || bundledInformation(movie.id);
  if (info) {
    const announced = info.releaseDates.filter(r => r.date && r.status !== "unconfirmed");
    if (announced.length && announced.every(r => r.date! <= today)) return screenings ? "now-showing" : "released";
    if (announced.some(r => r.date! > today)) return "upcoming";
  }
  if (movie.release && movie.release <= today && movie.status === "upcoming") return "released";
  return movie.status === "upcoming" ? "upcoming" : screenings ? "now-showing" : "released";
}
export function isUpcoming(movie: Movie, region = "IN", today?: string) {
  return ["upcoming", "releasing-soon"].includes(releaseState(movie, region, today));
}
export function releaseLabel(movie: Movie, region = "IN") {
  const r = regionalRelease(movie, region);
  return r?.date && r.status !== "unconfirmed" ? new Date(`${r.date}T12:00:00Z`).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }) : `${region === "IN" ? "India" : region} release to be confirmed`;
}
export function personPhoto(person: PersonCredit) {
  if (!person.profilePath) return undefined;
  const remote=person.profilePath.startsWith("/") && !person.profilePath.startsWith("/assets/") ? `https://image.tmdb.org/t/p/w342${person.profilePath}` : person.profilePath;
  return cachedAsset(remote)?.url || remote;
}
