import { bundledInformation, type MovieInformation } from "./movie-information";
import type { Movie } from "./catalog";

export interface MovieMetadataProvider { get(movie: Movie): Promise<MovieInformation | undefined> }
const cache = new Map<string, { expires: number; promise: Promise<MovieInformation | undefined> }>();
export const bundledMetadataProvider: MovieMetadataProvider = { get: async movie => movie.metadata || bundledInformation(movie.id) };
/** Server-only invocation. The credential never enters a response or browser bundle. */
export function metadataProvider(token?: string): MovieMetadataProvider {
  if (!token) return bundledMetadataProvider;
  return { get(movie) {
    const seed = movie.metadata || bundledInformation(movie.id);
    if (!seed?.tmdbId) return Promise.resolve(seed);
    const key = String(seed.tmdbId);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = (async () => {
      try {
        const r = await fetch(`https://api.themoviedb.org/3/movie/${seed.tmdbId}?append_to_response=credits,release_dates&language=en-US`, {
          headers: {Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(6000),
        });
        if (!r.ok) throw new Error("Metadata unavailable");
        const data = await r.json() as any;
        if (data.id !== seed.tmdbId) throw new Error("Movie identity mismatch");
        const source = `https://www.themoviedb.org/movie/${data.id}`;
        return {
          ...seed, overview:data.overview || seed.overview,
          cast:(data.credits?.cast || []).slice(0,30).map((p:any) => ({id:p.id,name:p.name,character:p.character,profilePath:p.profile_path})),
          crew:(data.credits?.crew || []).filter((p:any) => ["Director","Writer","Screenplay","Producer","Original Music Composer","Director of Photography"].includes(p.job)).slice(0,30).map((p:any) => ({id:p.id,name:p.name,job:p.job,profilePath:p.profile_path})),
          production:(data.production_companies || []).map((p:any) => p.name),
          releaseDates:(data.release_dates?.results || []).filter((r:any) => ["IN","US"].includes(r.iso_3166_1)).flatMap((r:any) => {
            const theatrical = r.release_dates.filter((d:any) => d.type === 3 || d.type === 2).sort((a:any,b:any) => a.release_date.localeCompare(b.release_date))[0];
            return theatrical ? [{region:r.iso_3166_1,date:theatrical.release_date.slice(0,10),status:"announced" as const,source}] : [];
          }),
          sources:[source],checked:new Date().toISOString().slice(0,10),
        } satisfies MovieInformation;
      } catch { return seed; }
    })();
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(key,{expires:Date.now()+86400000,promise});
    return promise;
  }};
}
