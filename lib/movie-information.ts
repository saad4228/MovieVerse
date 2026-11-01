import records from "../data/movie-details.json" with { type: "json" };
import type { Movie } from "./catalog";
import {cachedAsset} from "./asset-cache";

export type PersonCredit = { id?: number; name: string; character?: string; job?: string; profilePath?: string | null };
export type ReleaseInformation = { region: string; date: string | null; status: "announced" | "released" | "unconfirmed"; source: string };
export type MovieInformation = {
  tmdbId?: number; overview: string; story?: string; cast: PersonCredit[]; crew: PersonCredit[];
  production: string[]; releaseDates: ReleaseInformation[]; sources: string[]; checked: string;
  backdropPosition?: string;
};
export function bundledInformation(id: string): MovieInformation | undefined {
  return (records as unknown as Record<string, MovieInformation>)[id];
}
export function enrichMovieInformation(movie: Movie): Movie {
  const metadata = movie.metadata || bundledInformation(movie.id);
  return metadata ? { ...movie, metadata } : movie;
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
  if (!person.id || !person.profilePath) return undefined;
  const remote=person.profilePath.startsWith("/") ? `https://image.tmdb.org/t/p/w342${person.profilePath}` : person.profilePath;
  return cachedAsset(remote)?.url || remote;
}
