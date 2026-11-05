import { enrichMovieInformation, normalizeInformation, type MovieInformation, type PersonCredit } from "./movie-information";
import type { Movie } from "./catalog";
import { tmdbConfigured, tmdbRequest, type TmdbSettings } from "./tmdb";

export interface MovieMetadataProvider { get(movie: Movie): Promise<MovieInformation | undefined> }
type ProviderPerson = {id:number;name:string;character?:string;job?:string;profile_path?:string|null};
type ProviderMovie = {id:number;overview?:string;credits?:{cast?:ProviderPerson[];crew?:ProviderPerson[]};production_companies?:{name:string}[];release_dates?:{results:{iso_3166_1:string;release_dates:{type:number;release_date:string}[]}[]}};
const cache = new Map<string, { expires: number; promise: Promise<MovieInformation | undefined> }>();
function personIdentity(name: string) { return name.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " "); }

/** Keep the catalogue source primary and use a movie-ID-matched TMDB credit only
 * to fill missing details. If both providers have portraits, keep TMDB as a
 * fallback so a broken primary image does not erase a usable sourced image. */
function mergeCast(primary: PersonCredit[], fallback: ProviderPerson[]): PersonCredit[] {
  const merged = primary.map(person => ({ ...person }));
  for (const credit of fallback) {
    const index = merged.findIndex(person =>
      person.id && credit.id ? person.id === credit.id : personIdentity(person.name) === personIdentity(credit.name),
    );
    const profilePath = credit.profile_path?.trim() || undefined;
    if (index < 0) {
      merged.push({ id: credit.id, name: credit.name, character: credit.character?.trim() || undefined, profilePath });
      continue;
    }
    const person = merged[index];
    const primaryProfile = person.profilePath?.trim() || undefined;
    merged[index] = {
      ...person,
      id: person.id ?? credit.id,
      character: person.character?.trim() || credit.character?.trim() || undefined,
      profilePath: primaryProfile || profilePath,
      backupProfilePath: primaryProfile && profilePath && primaryProfile !== profilePath
        ? profilePath
        : person.backupProfilePath,
    };
  }
  return merged;
}
export const bundledMetadataProvider: MovieMetadataProvider = { get: async movie => enrichMovieInformation(movie).metadata };
/** Server-only invocation. The credential never enters a response or browser bundle. */
export function metadataProvider(credential?: string | TmdbSettings): MovieMetadataProvider {
  const settings = typeof credential === "string" ? { TMDB_READ_TOKEN: credential } : credential || {};
  if (!tmdbConfigured(settings)) return bundledMetadataProvider;
  return { get(movie) {
    const raw = enrichMovieInformation(movie).metadata;
    const seed = raw && normalizeInformation(raw);
    if (!seed?.tmdbId) return Promise.resolve(seed);
    const key = `${settings.TMDB_READ_TOKEN || settings.TMDB_API_KEY}:${seed.tmdbId}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const entry: { expires: number; promise: Promise<MovieInformation | undefined> } = {
      expires: Date.now() + 60_000,
      promise: Promise.resolve(seed),
    };
    entry.promise = (async () => {
      try {
        const result = await tmdbRequest(`movie/${seed.tmdbId}`, { append_to_response: "credits,release_dates", language: "en-IN" }, settings, 86400_000);
        const data = result.data as ProviderMovie;
        if (data.id !== seed.tmdbId) throw new Error("Movie identity mismatch");
        const source = `https://www.themoviedb.org/movie/${data.id}`;
        const metadata = normalizeInformation({
          ...seed, overview:data.overview || seed.overview,
          cast:mergeCast(seed.cast, data.credits?.cast?.slice(0, 40) || []),
          crew:data.credits?.crew?.length ? data.credits.crew.filter(p => ["Director","Writer","Screenplay","Producer","Original Music Composer","Director of Photography"].includes(p.job || '')).slice(0,30).map(p => ({id:p.id,name:p.name,job:p.job,profilePath:p.profile_path})) : seed.crew,
          production:data.production_companies?.length ? data.production_companies.map(p => p.name) : seed.production,
          releaseDates:[...seed.releaseDates.filter(seedDate=>!data.release_dates?.results.some(r=>r.iso_3166_1===seedDate.region && r.release_dates.some(d=>d.type===2 || d.type===3))), ...(data.release_dates?.results || []).filter(r => ["IN","US"].includes(r.iso_3166_1)).flatMap(r => {
            const theatrical = r.release_dates.filter(d => d.type === 3 || d.type === 2).sort((a,b) => a.release_date.localeCompare(b.release_date))[0];
            return theatrical ? [{region:r.iso_3166_1,date:theatrical.release_date.slice(0,10),status:"announced" as const,source}] : [];
          })],
          sources:[...new Set([...seed.sources,source])],checked:new Date().toISOString().slice(0,10),
        } satisfies MovieInformation);
        entry.expires = Date.now() + 86400000;
        return metadata;
      } catch (error) {
        cache.delete(key);
        throw error;
      }
    })();
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(key,entry);
    return entry.promise;
  }};
}
