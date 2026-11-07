// Node-owned catalogue refresh. The Worker is used only for authenticated,
// fenced D1 ingestion and publication.
import { collectionPlan, indiaToday } from "../lib/discovery-collections.ts";
import { genreSchema, movieSchema, normalizeMovie, pageSchema, tmdbRequest } from "../lib/tmdb.ts";
import { qualifies } from "../lib/catalogue-sync.ts";
import { uploadCollection } from "./catalogue-batch-chunking.mjs";

const origin = process.env.MOVIEVERSE_URL;
const adminToken = process.env.ADMIN_TOKEN;
const tmdbToken = process.env.TMDB_READ_TOKEN;
if (!origin || !adminToken || !tmdbToken)
  throw new Error("MOVIEVERSE_URL, ADMIN_TOKEN and TMDB_READ_TOKEN must be configured.");
const target = new URL("/api/catalogue-sync", origin);
if (target.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(target.hostname))
  throw new Error("HTTPS required.");
const kind = process.argv.includes("--trending") ? "trending" : "full";
const requestedRunId = process.argv.find((arg, index) => arg === "--run-id" && process.argv[index + 1])
  ? process.argv[process.argv.indexOf("--run-id") + 1] : undefined;
const settings = { TMDB_READ_TOKEN: tmdbToken, TMDB_API_BASE_URL: process.env.TMDB_API_BASE_URL };
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class CatalogueHttpError extends Error {
  constructor(message, readonlyStatus, retryable) {
    super(message);
    this.status = readonlyStatus;
    this.retryable = retryable;
  }
}

async function call(body) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok) return result;
      if ((response.status === 409 || response.status === 429 || response.status >= 500) && attempt < 3) {
        const retry = Number(response.headers.get("Retry-After"));
        await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(30000, retry * 1000) : 500 * 2 ** attempt);
        continue;
      }
      throw new CatalogueHttpError(
        result.error?.message || result.error || `Catalogue request failed with HTTP ${response.status}.`,
        response.status,
        response.status === 409 || response.status === 429 || response.status >= 500,
      );
    } catch (error) {
      if (error instanceof CatalogueHttpError && !error.retryable) throw error;
      if (attempt >= 3) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
}

async function tmdb(path, params, validate, stage, collection) {
  return tmdbRequest(path, params, settings, 0, validate, {
    stage,
    collection,
    log: diagnostic => console.log(JSON.stringify({ event: "node-tmdb-request", ...diagnostic })),
  });
}

const important = id =>
  id.startsWith("trending-") ||
  ["now-playing-IN", "upcoming-IN", "upcoming-endpoint-IN", "popular", "top-rated", "hollywood", "indian"].includes(id) ||
  id.startsWith("regional-") || id.startsWith("upcoming-language-");

const send = (runId, stage, payload = {}) =>
  call({ kind, operation: "node-batch", runId, stage, ...payload });

const started = await call({ kind, operation: "start", ...(requestedRunId ? { runId: requestedRunId } : {}) });
const runId = started.id;
const status = await call({ kind, operation: "status", runId });
const collectionStatus = new Map((status.collections ?? []).map(row => [row.collection, row]));
console.log(`Node-owned ${kind} refresh ${runId}; ${collectionStatus.size} collections planned.`);

const genreResult = await tmdb("genre/movie/list", { language: "en-US" }, value => genreSchema.safeParse(value).success, "genre-list");
const genres = Object.fromEntries(genreSchema.parse(genreResult.data).genres.map(genre => [String(genre.id), genre.name]));
await send(runId, "genres", { genres });

for (const spec of collectionPlan(kind)) {
  const saved = collectionStatus.get(spec.id);
  if (saved?.status === "completed") continue;
  const candidates = new Map();
  const firstPage = Math.max(1, saved?.next_page ?? 1);
  for (let page = 1; page <= spec.pages; page++) {
    const result = await tmdb(spec.path, { language: "en-US", ...spec.params, page: String(page) },
      value => {
        const parsed = pageSchema.safeParse(value);
        return parsed.success && parsed.data.page === page;
      }, "collection-page", spec.id);
    const data = pageSchema.parse(result.data);
    for (const [index, raw] of data.results.entries()) if (!raw.adult) candidates.set(raw.id, { raw, rank: (page - 1) * 20 + index });
    if (page >= firstPage)
      await send(runId, "page", { collection: spec.id, page, totalPages: Math.min(data.total_pages || spec.pages, spec.pages), items: data.results.filter(movie => !movie.adult).map((movie, index) => ({ movieId: movie.id, rank: (page - 1) * 20 + index })) });
  }

  const movies = [];
  for (const candidate of candidates.values()) {
    let raw = candidate.raw;
    if (important(spec.id)) {
      const detail = await tmdb(`movie/${raw.id}`, { language: "en-US", append_to_response: "credits,videos,images,release_dates", include_image_language: "en,hi,null" },
        value => { const parsed = movieSchema.safeParse(value); return parsed.success && parsed.data.id === raw.id; }, "movie-detail", spec.id);
      raw = movieSchema.parse(detail.data);
    }
    if (raw.adult) continue;
    const movie = normalizeMovie(raw, new Map(Object.entries(genres).map(([id, name]) => [Number(id), name])), new Date().toISOString());
    movies.push({ movieId: raw.id, rank: candidate.rank, document: movie, popularity: raw.popularity ?? 0, voteCount: raw.vote_count ?? 0 });
  }
  const eligible = movies.filter(item => qualifies(item.document, spec, indiaToday(new Date(started.started))));
  const publicationStart = saved?.status === "publishing" ? saved.detail_cursor ?? 0 : 0;
  await uploadCollection({
    send: (stage, payload) => send(runId, stage, payload),
    collection: spec.id,
    movies,
    eligible,
    publicationStart,
  });
  console.log(`[${spec.id}] ${movies.length} validated records; published ${eligible.length} memberships.`);
}

await send(runId, "complete");
console.log(JSON.stringify(await call({ kind, operation: "status", runId }), null, 2));
