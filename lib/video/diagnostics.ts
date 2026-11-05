import type { Movie } from "../catalog";

/** Deliberately omit media URLs: signed query strings may contain credentials. */
export function playbackDiagnostic(movie: Pick<Movie, "id" | "title">, event: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production")
    console.debug("[MovieVerse playback]", { movieId: movie.id, title: movie.title, event, ...details });
}
