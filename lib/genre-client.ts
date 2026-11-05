import type { Movie } from "./catalog";
import type { GenreResult } from "./genre-catalog";

// One canonical record per provider ID; queries keep references, never booking inventory.
const entities = new Map<string, Movie>();
const cache = new Map<string, { expires: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export function peekGenre<T>(url: string): T | undefined {
  const hit = cache.get(url);
  return hit && hit.expires > Date.now() ? hit.data as T : undefined;
}
export async function loadGenre<T>(url: string): Promise<T> {
  const hit = peekGenre<T>(url);
  if (hit) return hit;
  if (pending.has(url)) return pending.get(url) as Promise<T>;
  const request = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json() as { code?: string; error?: string; movies?: Movie[] };
    if (!response.ok) throw new Error(data.code === "TMDB_NOT_CONFIGURED"
      ? "Genre discovery is not connected yet. You can still explore the movies above."
      : data.error || "Movie discovery is temporarily unavailable.");
    if (Array.isArray(data.movies)) {
      data.movies = (data as GenreResult).movies.map(movie => {
        const existing = entities.get(movie.id);
        if (existing && JSON.stringify(existing)===JSON.stringify(movie)) return existing;
        if (entities.size >= 2000) entities.delete(entities.keys().next().value!);
        entities.set(movie.id, movie); return movie;
      });
    }
    if (cache.size >= 60) cache.delete(cache.keys().next().value!);
    cache.set(url, { expires: Date.now() + 300000, data });
    return data;
  })();
  pending.set(url, request);
  try { return await request as T; } finally { pending.delete(url); }
}
