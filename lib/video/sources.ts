import type { Movie } from "../catalog";

export type TrailerSource = {
  id: string;
  provider: "direct-mp4" | "hls" | "youtube" | "other";
  url: string;
  type: "official-trailer" | "teaser" | "preview" | "sample";
  playbackAllowed: boolean;
  isPrimary?: boolean;
  height?: number;
  language?: string;
  posterImage?: string;
  attribution?: string;
  licenseUrl?: string;
};

export function safeMediaUrl(url: string) {
  if (/^\/assets\/[^\\\s]*$/.test(url) && !url.includes("..")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

// An explicitly configured list replaces the legacy field, including an empty list.
export function trailerSources(movie: Movie): TrailerSource[] {
  const sources: TrailerSource[] =
    movie.trailers ??
    (movie.trailer
      ? [
          {
            id: `${movie.id}-direct`,
            provider: /\.m3u8(?:\?|$)/i.test(movie.trailer)
              ? "hls"
              : "direct-mp4",
            url: movie.trailer,
            type: movie.id === "sintel" ? "sample" : "official-trailer",
            playbackAllowed: true,
            isPrimary: true,
            attribution:
              movie.id === "sintel"
                ? "Sintel © Blender Foundation · CC BY 3.0"
                : movie.mediaCredit,
          },
        ]
      : []);
  return sources.filter((s) => safeMediaUrl(s.url));
}

export function directSources(movie: Movie): TrailerSource[] {
  return trailerSources(movie)
    .filter(
      (s) =>
        s.playbackAllowed &&
        (s.provider === "direct-mp4" || s.provider === "hls") &&
        !/^https:\/\/(?:[^/]+\.)?(?:youtube\.com|youtu\.be)\//i.test(s.url),
    )
    .filter((s, i, all) => all.findIndex((other) => other.url === s.url) === i)
    .sort(
      (a, b) =>
        Number(!!b.isPrimary) - Number(!!a.isPrimary) ||
        (b.height ?? 0) - (a.height ?? 0),
    );
}

export function officialTrailerLink(movie: Movie): string | undefined {
  const external = trailerSources(movie).find(
    (s) => s.provider === "youtube" || s.provider === "other",
  );
  return (
    external?.url ||
    (movie.youtubeId && /^[\w-]{11}$/.test(movie.youtubeId)
      ? `https://www.youtube.com/watch?v=${movie.youtubeId}`
      : undefined)
  );
}

// Per-tab cooldown. No persistent restriction detection or access-control workarounds.
const failures = new Map<string, number>();
const cooldown = 5 * 60 * 1000;
export function hasFailed(url: string, now = Date.now()) {
  const until = failures.get(url) ?? 0;
  if (until <= now) {
    failures.delete(url);
    return false;
  }
  return true;
}
export function markFailed(url: string, now = Date.now()) {
  failures.set(url, now + cooldown);
}
export function clearFailures(sources: TrailerSource[]) {
  sources.forEach((s) => failures.delete(s.url));
}

export function fitScreen(width: number, height: number, aspect: number) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const w = Math.min(width, height * ratio);
  return { width: w, height: w / ratio };
}
