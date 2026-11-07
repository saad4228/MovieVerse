import { z } from "zod";
import type { Movie } from "./catalog";

export type TmdbSettings = {
  TMDB_READ_TOKEN?: string;
  TMDB_API_KEY?: string;
  TMDB_API_BASE_URL?: string;
  fetcher?: typeof fetch;
};
export type TmdbDiagnostic = {
  stage: string;
  collection?: string;
  tokenPresent: boolean;
  upstreamStatus?: number;
  category: "configuration" | "authentication" | "rate_limit" | "provider" | "network" | "invalid_response";
  exceptionType: string;
  durationMs: number;
  requestId?: string;
  responseDetails?: string;
};
export type TmdbRequestContext = {
  stage?: string;
  collection?: string;
  log?: (diagnostic: TmdbDiagnostic) => void;
};
export const discoveryQuery = z.object({
  section: z.enum(["trending", "now-playing", "upcoming", "popular", "top-rated"]).default("trending"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: z.enum(["en-IN", "hi-IN"]).default("en-IN"),
  window: z.enum(["day", "week"]).default("day"),
});
export type DiscoveryQuery = z.infer<typeof discoveryQuery>;
export type MovieDiscoveryResult = {
  source: "tmdb"; region: "IN"; scope: "global-trending" | "india-release-market";
  fetchedAt: string; page: number; totalPages: number; movies: Movie[];
};
export class TmdbError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 503,
    public retryAfter?: number,
    public diagnostic?: Omit<TmdbDiagnostic, "durationMs">,
  ) { super(message); }
}
export const movieSchema = z.object({
  id: z.number().int().positive(), title: z.string(), original_title: z.string().optional(),
  overview: z.string().nullish(), poster_path: z.string().nullish(), backdrop_path: z.string().nullish(),
  release_date: z.string().optional(), vote_average: z.number().optional(), vote_count: z.number().optional(), popularity:z.number().optional(),
  original_language: z.string().optional(), genre_ids: z.array(z.number()).optional(), adult: z.boolean().optional(),
  origin_country:z.array(z.string()).optional(),
  production_countries:z.array(z.object({iso_3166_1:z.string(),name:z.string()})).optional(),
  runtime: z.number().nullable().optional(), tagline: z.string().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  spoken_languages: z.array(z.object({ english_name: z.string() })).optional(),
  credits: z.object({
    cast: z.array(z.object({ id: z.number(), name: z.string(), character: z.string().optional(), profile_path: z.string().nullish() })).optional(),
    crew: z.array(z.object({ id: z.number(), name: z.string(), job: z.string(), profile_path: z.string().nullish() })).optional(),
  }).optional(),
  videos: z.object({ results: z.array(z.object({ id: z.string(), key: z.string(), site: z.string(), type: z.string(), official: z.boolean().optional() })) }).optional(),
  images: z.object({ backdrops: z.array(z.object({ file_path: z.string() })) }).optional(),
  production_companies: z.array(z.object({ name: z.string() })).optional(),
  release_dates: z.object({ results: z.array(z.object({ iso_3166_1: z.string(), release_dates: z.array(z.object({ type: z.number(), release_date: z.string() })) })) }).optional(),
});
export const pageSchema = z.object({ page: z.number().int(), total_pages: z.number().int(), total_results:z.number().int().optional(), results: z.array(movieSchema) });
export const genreSchema = z.object({ genres: z.array(z.object({ id: z.number(), name: z.string() })) });
type Cached = { expires: number; value: Promise<{ data: unknown; fetchedAt: string }> };
// Per-worker, bounded, coalesced cache. Credentials remain server-side and separate cache namespaces.
const caches = new Map<string, Map<string, Cached>>();
const cooldowns = new Map<string, number>();
const safeProviderDetails = (text: string) => {
  const compact = text.replace(/[\u0000-\u001f]+/g, " ").trim();
  if (!compact) return undefined;
  try {
    const parsed: unknown = JSON.parse(compact);
    if (parsed && typeof parsed === "object") {
      const value = parsed as Record<string, unknown>;
      const statusMessage = typeof value.status_message === "string" ? value.status_message : "";
      const statusCode = typeof value.status_code === "number" ? `status_code=${value.status_code}` : "";
      return [statusCode, statusMessage].filter(Boolean).join("; ").slice(0, 300) || undefined;
    }
  } catch {
    // Provider proxies may return plain text.
  }
  return compact.slice(0, 300);
};
const exceptionType = (error: unknown) => error instanceof Error ? error.name : typeof error;
const emitDiagnostic = (context: TmdbRequestContext | undefined, diagnostic: TmdbDiagnostic) => context?.log?.(diagnostic);
export function tmdbConfigured(settings: TmdbSettings) { return !!(settings.TMDB_READ_TOKEN?.trim() || settings.TMDB_API_KEY?.trim()); }
export async function tmdbRequest(path: string, params: Record<string, string>, settings: TmdbSettings, ttl = 15 * 60_000, validate?: (value: unknown) => boolean, context?: TmdbRequestContext) {
  const token = settings.TMDB_READ_TOKEN?.trim();
  const apiKey = settings.TMDB_API_KEY?.trim();
  if (!token && !apiKey) {
    emitDiagnostic(context, { stage: context?.stage ?? path, collection: context?.collection, tokenPresent: false, category: "configuration", exceptionType: "TmdbConfigurationError", durationMs: 0 });
    throw new TmdbError("TMDB_NOT_CONFIGURED", "Movie discovery is not connected yet. The demo catalogue remains available below.");
  }
  const identity = token ? `token:${token}` : `key:${apiKey}`;
  const cooldown = cooldowns.get(identity) || 0;
  if (cooldown > Date.now()) throw new TmdbError("TMDB_RATE_LIMITED", "Movie discovery is busy. Please try again shortly.", 429, Math.ceil((cooldown - Date.now()) / 1000));
  let cache = caches.get(identity);
  if (!cache) {
    if (caches.size >= 5) { const oldest = caches.keys().next().value!; caches.delete(oldest); cooldowns.delete(oldest); }
    cache = new Map(); caches.set(identity, cache);
  }
  const url = new URL(`${settings.TMDB_API_BASE_URL?.replace(/\/+$/, "") ?? "https://api.themoviedb.org/3"}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const cacheKey = url.href;
  const existing = cache.get(cacheKey);
  if (existing && existing.expires > Date.now()) return existing.value;
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  const entry: Cached = { expires: Date.now() + ttl, value: Promise.resolve({ data: null, fetchedAt: "" }) };
  entry.value = (async () => {
    const started = Date.now();
    const diagnosticBase = { stage: context?.stage ?? path, collection: context?.collection, tokenPresent: Boolean(token) };
    try {
      if (!token) url.searchParams.set("api_key", apiKey!);
      const response = await (settings.fetcher ?? fetch)(url.href, { headers: { accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(8000), redirect: "manual" });
      const requestId = response.headers.get("x-tmdb-request-id") ?? response.headers.get("x-request-id") ?? response.headers.get("cf-ray") ?? undefined;
      const details = response.ok ? undefined : safeProviderDetails(await response.clone().text());
      if (response.status >= 300 && response.status < 400) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "provider" as const, exceptionType: "TmdbRedirectError", requestId, responseDetails: details };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_REDIRECTED", "Movie discovery returned an unexpected redirect.", 503, undefined, diagnostic);
      }
      if (response.status === 429) {
        const rawDelay = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(rawDelay) && rawDelay > 0 ? Math.min(300, Math.ceil(rawDelay)) : 30;
        cooldowns.set(identity, Date.now() + delay * 1000);
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "rate_limit" as const, exceptionType: "TmdbRateLimitError", requestId, responseDetails: details };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_RATE_LIMITED", "Movie discovery is busy. Please try again shortly.", 429, delay, diagnostic);
      }
      if (response.status === 401 || response.status === 403) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "authentication" as const, exceptionType: "TmdbAuthenticationError", requestId, responseDetails: details };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_AUTH_FAILED", "Movie discovery could not authenticate. Please contact support.", 503, undefined, diagnostic);
      }
      if (response.status === 404) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "provider" as const, exceptionType: "TmdbNotFoundError", requestId, responseDetails: details };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_NOT_FOUND", "This movie was not found.", 404, undefined, diagnostic);
      }
      if (!response.ok) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "provider" as const, exceptionType: "TmdbProviderError", requestId, responseDetails: details };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_UNAVAILABLE", "Movie discovery is temporarily unavailable. Please try again.", 503, undefined, diagnostic);
      }
      let data: unknown;
      try {
        data = await response.json();
      } catch (error) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "invalid_response" as const, exceptionType: exceptionType(error), requestId };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_INVALID_RESPONSE", "Movie discovery returned an invalid response.", 503, undefined, diagnostic);
      }
      if (validate && !validate(data)) {
        const diagnostic = { ...diagnosticBase, upstreamStatus: response.status, category: "invalid_response" as const, exceptionType: "TmdbSchemaValidationError", requestId };
        emitDiagnostic(context, { ...diagnostic, durationMs: Date.now() - started });
        throw new TmdbError("TMDB_INVALID_RESPONSE", "Movie discovery returned an invalid response.", 503, undefined, diagnostic);
      }
      emitDiagnostic(context, { ...diagnosticBase, upstreamStatus: response.status, category: "provider", exceptionType: "None", durationMs: Date.now() - started, requestId });
      return { data, fetchedAt: new Date().toISOString() };
    } catch (error) {
      cache!.delete(cacheKey);
      if (error instanceof TmdbError) throw error;
      const diagnostic = { ...diagnosticBase, category: "network" as const, exceptionType: exceptionType(error), durationMs: Date.now() - started };
      emitDiagnostic(context, diagnostic);
      throw new TmdbError("TMDB_UNAVAILABLE", "Movie discovery is temporarily unavailable. Please try again.", 503, undefined, diagnostic);
    }
  })();
  cache.set(cacheKey, entry);
  return entry.value;
}
const image = (path: string | null | undefined, size: string) => path && /^\/[A-Za-z0-9._-]+$/.test(path) ? `https://image.tmdb.org/t/p/${size}${path}` : "";
function languageName(code:string) {
  try { return new Intl.DisplayNames(["en"],{type:"language"}).of(code) || code; } catch { return code; }
}
export function normalizeMovie(data: z.infer<typeof movieSchema>, genres: Map<number, string>, fetchedAt: string): Movie {
  const source = `https://www.themoviedb.org/movie/${data.id}`;
  const trailers = (data.videos?.results || []).filter(v => v.official && v.site === "YouTube" && ["Trailer", "Teaser"].includes(v.type) && /^[A-Za-z0-9_-]{11}$/.test(v.key));
  const regionalDates = (data.release_dates?.results || []).filter(r => ["IN","US"].includes(r.iso_3166_1)).flatMap(r => {
    const date = r.release_dates.filter(d => [2, 3].includes(d.type)).sort((a,b) => a.release_date.localeCompare(b.release_date))[0];
    return date ? [{ region: r.iso_3166_1, date: date.release_date.slice(0, 10), status: "announced" as const, source }] : [];
  });
  return {
    providerGenreIds:data.genres?.map(g=>g.id) ?? data.genre_ids ?? [], originalLanguage:data.original_language, productionCountries:data.production_countries?.map(c=>c.iso_3166_1), originCountries:data.origin_country,
    id: `tmdb-${data.id}`, title: data.title, aliases: data.original_title ? [data.original_title] : [],
    tagline: data.tagline || "", description: data.overview || "Overview not supplied by TMDB.",
    genre: data.genres?.map(g => g.name) || (data.genre_ids || []).map(id => genres.get(id)).filter((g): g is string => !!g),
    languages: data.spoken_languages?.map(l => l.english_name) || (data.original_language ? [languageName(data.original_language)] : []),
    duration: data.runtime || 0, rating: data.vote_average || 0, votes: String(data.vote_count || 0), certificate: "Not supplied",
    poster: image(data.poster_path, "w500"), backdrop: image(data.backdrop_path, "w1280"), release: data.release_date || "",
    status: data.release_date && data.release_date > new Date().toISOString().slice(0, 10) ? "upcoming" : "showing",
    formats: [], cast: data.credits?.cast?.map(p => p.name) || [], trailer: null, accent: "#f9be3c",
    trailers: trailers.map(v => ({ id: v.id, provider: "youtube", url: `https://www.youtube.com/watch?v=${v.key}`, type: v.type === "Teaser" ? "teaser" : "official-trailer", playbackAllowed: false, attribution: "Official trailer listed by TMDB" })),
    alternativeBackdrops: data.images?.backdrops.slice(0, 4).map(b => image(b.file_path, "w1280")).filter(Boolean),
    metadata: { tmdbId: data.id, overview: data.overview || "", cast: data.credits?.cast?.slice(0,30).map(p=>({id:p.id,name:p.name,character:p.character,profilePath:p.profile_path})) || [], crew: data.credits?.crew?.filter(p=>["Director","Writer","Screenplay","Producer","Original Music Composer","Director of Photography"].includes(p.job)).map(p=>({id:p.id,name:p.name,job:p.job,profilePath:p.profile_path})) || [], production: data.production_companies?.map(p => p.name) || [], releaseDates: regionalDates, sources: [source], checked: fetchedAt.slice(0,10) },
  };
}
export interface MovieCatalogProvider {
  list(query: DiscoveryQuery): Promise<MovieDiscoveryResult>;
  detail(id: number, language?: "en-IN" | "hi-IN"): Promise<{ movie: Movie; source: "tmdb"; fetchedAt: string }>;
}
export function tmdbCatalog(settings: TmdbSettings): MovieCatalogProvider {
  return {
    async list(query) {
      const paths = { trending: `trending/movie/${query.window}`, "now-playing": "movie/now_playing", upcoming: "movie/upcoming", popular: "movie/popular", "top-rated": "movie/top_rated" };
      const [result, genreResult] = await Promise.all([
        tmdbRequest(paths[query.section], { language: query.language, page: String(query.page), ...(query.section === "trending" ? {} : { region: "IN" }) }, settings, 15 * 60_000, value=>{const result=pageSchema.safeParse(value);return result.success && result.data.page===query.page;}),
        tmdbRequest("genre/movie/list", { language: query.language }, settings, 86400_000, value=>genreSchema.safeParse(value).success),
      ]);
      const parsed = pageSchema.safeParse(result.data);
      const genreData = genreSchema.safeParse(genreResult.data);
      if (!parsed.success || !genreData.success || parsed.data.page !== query.page) throw new TmdbError("TMDB_INVALID_RESPONSE", "Movie discovery returned an invalid response.");
      const genres = new Map(genreData.data.genres.map(g => [g.id, g.name]));
      const unique = new Map(parsed.data.results.filter(m => !m.adult).map(m => [m.id, normalizeMovie(m, genres, result.fetchedAt)]));
      return { source: "tmdb", region: "IN", scope: query.section === "trending" ? "global-trending" : "india-release-market", fetchedAt: result.fetchedAt, page: parsed.data.page, totalPages: Math.min(500, parsed.data.total_pages), movies: [...unique.values()] };
    },
    async detail(id, language = "en-IN") {
      if (!Number.isSafeInteger(id) || id < 1) throw new TmdbError("TMDB_INVALID_ID", "Invalid movie ID.", 400);
      const result = await tmdbRequest(`movie/${id}`, { language, append_to_response: "credits,videos,images,release_dates", include_image_language: "en,hi,null" }, settings, 3600_000, value=>{const parsed=movieSchema.safeParse(value);return parsed.success && parsed.data.id===id;});
      const parsed = movieSchema.safeParse(result.data);
      if (!parsed.success || parsed.data.id !== id) throw new TmdbError("TMDB_INVALID_RESPONSE", "Movie details returned an invalid response.");
      const movie = normalizeMovie(parsed.data, new Map(), result.fetchedAt);
      // Preserve the portrait names expected by the existing reusable information component.
      movie.metadata!.cast = parsed.data.credits?.cast?.map(p => ({ id: p.id, name: p.name, character: p.character, profilePath: p.profile_path })) || [];
      movie.metadata!.crew = parsed.data.credits?.crew?.filter(p => ["Director", "Writer", "Screenplay", "Producer", "Original Music Composer", "Director of Photography"].includes(p.job)).map(p => ({ id: p.id, name: p.name, job: p.job, profilePath: p.profile_path })) || [];
      return { movie, source: "tmdb", fetchedAt: result.fetchedAt };
    },
  };
}
