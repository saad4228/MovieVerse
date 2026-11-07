import {
  genreSchema,
  movieSchema,
  normalizeMovie,
  pageSchema,
  TmdbError,
  tmdbRequest,
  type TmdbDiagnostic,
  type TmdbSettings,
} from "./tmdb";
import {
  collectionPlan,
  indiaToday,
  type CollectionSpec,
} from "./discovery-collections";
import { qualifies, theatricalDate } from "./catalogue-sync";
import type { Movie } from "./catalog";
import {
  acquireCatalogueLease,
  assertCatalogueLease,
  releaseCatalogueLease,
  renewCatalogueLease,
  type CatalogueLease,
} from "./catalogue-sync-lock";

export const MAX_TOTAL_SUBREQUESTS = 35;
export const MAX_EXTERNAL_SUBREQUESTS = 25;
export const DETAIL_BATCH_SIZE = 1;
export const DETAIL_CONCURRENCY = 4;
const MAX_ITEM_RETRIES = 3;

type RunRow = {
  id: string;
  kind: "full" | "trending";
  started: number;
  finished: number | null;
  status: string;
  report: string;
};
type CollectionRow = {
  run_id: string;
  collection: string;
  generation: string;
  planned_pages: number;
  next_page: number;
  total_pages: number | null;
  detail_cursor: number;
  status: string;
  retry_count: number;
  error: string | null;
  started: number;
  updated: number;
};
type ItemRow = {
  movie_id: number;
  rank: number;
  state: string;
  retry_count: number;
  error: string | null;
};
type SyncReport = {
  startedAt: string;
  plannedCollections: number;
  completedCollections: number;
  imported: number;
  updated: number;
  failures: number;
  failureCategories: Record<string, number>;
  genres?: Record<string, string>;
};
type RequestBudget = { used: number };

function consume(budget: RequestBudget, amount = 1) {
  if (budget.used + amount > MAX_TOTAL_SUBREQUESTS)
    throw new TmdbError("TMDB_BUDGET_EXCEEDED", "The sync step reached its total subrequest budget.");
  budget.used += amount;
}

async function dbFirst<T>(db: D1Database, sql: string, budget: RequestBudget, ...values: unknown[]) {
  consume(budget);
  return db.prepare(sql).bind(...values).first<T>();
}

async function dbAll<T>(db: D1Database, sql: string, budget: RequestBudget, ...values: unknown[]) {
  consume(budget);
  return (await db.prepare(sql).bind(...values).all<T>()).results;
}

async function dbRun(db: D1Database, sql: string, budget: RequestBudget, ...values: unknown[]) {
  consume(budget);
  return db.prepare(sql).bind(...values).run();
}

async function dbBatch(db: D1Database, statements: D1PreparedStatement[], budget: RequestBudget) {
  consume(budget);
  return db.batch(statements);
}

const nowMs = () => Date.now();
const readReport = (value: string): SyncReport => {
  try {
    const report = JSON.parse(value) as Partial<SyncReport>;
    return {
      startedAt: report.startedAt ?? new Date().toISOString(),
      plannedCollections: report.plannedCollections ?? 0,
      completedCollections: report.completedCollections ?? 0,
      imported: report.imported ?? 0,
      updated: report.updated ?? 0,
      failures: report.failures ?? 0,
      failureCategories: report.failureCategories ?? {},
      genres: report.genres,
    };
  } catch {
    return {
      startedAt: new Date().toISOString(),
      plannedCollections: 0,
      completedCollections: 0,
      imported: 0,
      updated: 0,
      failures: 0,
      failureCategories: {},
    };
  }
};
const saveReport = async (db: D1Database, runId: string, report: SyncReport) =>
  db.prepare("UPDATE discovery_sync_runs SET report=? WHERE id=?")
    .bind(JSON.stringify(report), runId).run();
const diagnosticContext = (
  spec: CollectionSpec | undefined,
  stage: string,
  log?: (diagnostic: TmdbDiagnostic) => void,
) => ({ stage, collection: spec?.id, log });

async function request(
  path: string,
  params: Record<string, string>,
  settings: TmdbSettings,
  validate: (value: unknown) => boolean,
  context: ReturnType<typeof diagnosticContext>,
  budget: RequestBudget,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      if (budget.used >= MAX_TOTAL_SUBREQUESTS)
        throw new TmdbError("TMDB_BUDGET_EXCEEDED", "The sync step reached its external request budget.");
      consume(budget);
      return await tmdbRequest(path, params, settings, 0, validate, context);
    } catch (error) {
      if (
        attempt >= 1 ||
        (error instanceof TmdbError &&
          ["TMDB_AUTH_FAILED", "TMDB_NOT_CONFIGURED", "TMDB_INVALID_RESPONSE", "TMDB_NOT_FOUND", "TMDB_REDIRECTED", "TMDB_BUDGET_EXCEEDED"].includes(error.code))
      )
        throw error;
      const delay = error instanceof TmdbError && error.retryAfter
        ? Math.min(30000, error.retryAfter * 1000)
        : 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function getRun(db: D1Database, runId: string, budget?: RequestBudget) {
  if (budget) return dbFirst<RunRow>(db, "SELECT * FROM discovery_sync_runs WHERE id=?", budget, runId);
  return db.prepare("SELECT * FROM discovery_sync_runs WHERE id=?").bind(runId).first<RunRow>();
}

async function getCollections(db: D1Database, runId: string, budget?: RequestBudget) {
  if (budget) return dbAll<CollectionRow>(db, "SELECT * FROM discovery_sync_collections WHERE run_id=? ORDER BY collection", budget, runId);
  return (await db.prepare("SELECT * FROM discovery_sync_collections WHERE run_id=? ORDER BY collection").bind(runId).all<CollectionRow>()).results;
}

async function beginBatch(db: D1Database, runId: string, collection: string | null, kind: string, budget: RequestBudget) {
  const id = crypto.randomUUID();
  await dbRun(db, "INSERT INTO discovery_sync_batches(id,run_id,collection,kind,ordinal,started) VALUES(?,?,?,?,?,?)", budget, id, runId, collection, kind, Date.now(), Date.now());
  return id;
}

async function finishBatch(db: D1Database, batchId: string, status: "completed" | "failed", error: string | null, budget: RequestBudget) {
  await dbRun(db, "UPDATE discovery_sync_batches SET status=?,finished=?,error=? WHERE id=?", budget, status, Date.now(), error, batchId);
}
function finishBatchStatement(db: D1Database, batchId: string, status: "completed" | "failed", error: string | null) {
  return db.prepare("UPDATE discovery_sync_batches SET status=?,finished=?,error=? WHERE id=?")
    .bind(status, Date.now(), error, batchId);
}

export async function startOrResumeCatalogueRun(
  db: D1Database,
  kind: "full" | "trending",
  requestedRunId?: string,
  now = new Date(),
) {
  if (requestedRunId) {
    const requested = await getRun(db, requestedRunId);
    if (!requested || requested.kind !== kind) throw new Error("Catalogue run was not found.");
    return requested;
  }
  const active = await db.prepare("SELECT * FROM discovery_sync_runs WHERE status='running' ORDER BY started DESC LIMIT 1").first<RunRow>();
  if (active) return active;
  const plan = collectionPlan(kind, now);
  const runId = crypto.randomUUID();
  const started = nowMs();
  const report: SyncReport = {
    startedAt: now.toISOString(),
    plannedCollections: plan.length,
    completedCollections: 0,
    imported: 0,
    updated: 0,
    failures: 0,
    failureCategories: {},
  };
  try {
    await db.prepare("INSERT INTO discovery_sync_runs(id,kind,started,status,report) VALUES(?,?,?,'running',?)")
      .bind(runId, kind, started, JSON.stringify(report)).run();
  } catch (error) {
    const concurrent = await db.prepare("SELECT * FROM discovery_sync_runs WHERE status='running' ORDER BY started ASC LIMIT 1").first<RunRow>();
    if (concurrent) return concurrent;
    throw error;
  }
  for (let offset = 0; offset < plan.length; offset += 80) {
    await db.batch(plan.slice(offset, offset + 80).map((spec) =>
      db.prepare("INSERT INTO discovery_sync_collections(run_id,collection,generation,planned_pages,started,updated) VALUES(?,?,?,?,?,?)")
        .bind(runId, spec.id, runId, spec.pages, started, started)));
  }
  return (await getRun(db, runId))!;
}

async function updateFailure(
  db: D1Database,
  runId: string,
  collection: CollectionRow,
  error: unknown,
  report: SyncReport,
  budget?: RequestBudget,
) {
  const category = error instanceof TmdbError ? error.diagnostic?.category ?? "provider" : "database";
  const code = error instanceof TmdbError ? error.code : "SYNC_FAILED";
  report.failures++;
  report.failureCategories[category] = (report.failureCategories[category] ?? 0) + 1;
  const run = budget
    ? (sql: string, ...values: unknown[]) => dbRun(db, sql, budget, ...values)
    : (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).run();
  await run("UPDATE discovery_sync_collections SET status='failed',retry_count=retry_count+1,error=?,updated=? WHERE run_id=? AND collection=?", code, nowMs(), runId, collection.collection);
  if (budget) await dbRun(db, "UPDATE discovery_sync_runs SET report=? WHERE id=?", budget, JSON.stringify(report), runId);
  else await saveReport(db, runId, report);
}

function storeMovieStatement(db: D1Database, movie: Movie, raw: ReturnType<typeof movieSchema.parse>) {
  const origins = movie.originCountries?.length ? movie.originCountries : (movie.productionCountries ?? []);
  return db.prepare(
    "INSERT INTO discovery_movies(id,document,title,release_date,language,origins,genres,popularity,rating,votes,runtime,india_release,us_release,first_imported,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,title=excluded.title,release_date=excluded.release_date,language=excluded.language,origins=excluded.origins,genres=excluded.genres,popularity=excluded.popularity,rating=excluded.rating,votes=excluded.votes,runtime=excluded.runtime,india_release=excluded.india_release,us_release=excluded.us_release,updated=excluded.updated",
  ).bind(
    raw.id, JSON.stringify(movie), movie.title, movie.release,
    movie.originalLanguage ?? "", JSON.stringify(origins),
    JSON.stringify(movie.providerGenreIds ?? []), raw.popularity ?? 0,
    movie.rating, raw.vote_count ?? 0, movie.duration,
    theatricalDate(movie, "IN"), theatricalDate(movie, "US"),
    nowMs(), nowMs(),
  );
}
function recordMovieChange(report: SyncReport, existing: boolean) {
  if (existing) report.updated++;
  else report.imported++;
}

async function processDetails(
  db: D1Database,
  run: RunRow,
  collection: CollectionRow,
  spec: CollectionSpec,
  settings: TmdbSettings,
  report: SyncReport,
  budget: RequestBudget,
  lease: CatalogueLease,
  diagnostics?: (diagnostic: TmdbDiagnostic) => void,
) {
  const items = await dbAll<ItemRow>(db,
    "SELECT movie_id,rank,state,retry_count,error FROM discovery_sync_items WHERE run_id=? AND collection=? AND ((state='pending') OR (state='failed' AND retry_count<?)) ORDER BY rank LIMIT ?",
    budget, run.id, collection.collection, MAX_ITEM_RETRIES, DETAIL_BATCH_SIZE);
  if (!items.length) return false;
  const genres = new Map(Object.entries(report.genres ?? {}).map(([id, name]) => [Number(id), name]));
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        await renewCatalogueLease(db, lease, nowMs(), () => consume(budget));
        const existing = await dbFirst<{ document: string; updated: number }>(db, "SELECT document,updated FROM discovery_movies WHERE id=?", budget, item.movie_id);
        let movie: Movie;
        if (existing && existing.updated > nowMs() - 86400_000 && !spec.id.startsWith("upcoming") && spec.id !== "now-playing-IN") {
          movie = JSON.parse(existing.document) as Movie;
          report.updated++;
        } else {
          let parsedMovie: ReturnType<typeof movieSchema.parse> | undefined;
          const result = await request(
            `movie/${item.movie_id}`,
            { language: "en-US", append_to_response: "credits,videos,images,release_dates", include_image_language: "en,hi,null" },
            settings,
            (value) => {
              const parsed = movieSchema.safeParse(value);
              if (parsed.success && parsed.data.id === item.movie_id) parsedMovie = parsed.data;
              return parsed.success && parsed.data.id === item.movie_id;
            },
            diagnosticContext(spec, "movie-detail", diagnostics),
            budget,
          );
          const raw = parsedMovie ?? movieSchema.parse(result.data);
          if (raw.adult) {
            await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
            await dbRun(db, "UPDATE discovery_sync_items SET state='complete',updated=? WHERE run_id=? AND collection=? AND movie_id=?", budget, nowMs(), run.id, collection.collection, item.movie_id);
            return;
          }
          movie = normalizeMovie(raw, genres, result.fetchedAt);
          await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
          await dbBatch(db, [
            storeMovieStatement(db, movie, raw),
            db.prepare("UPDATE discovery_sync_items SET state='complete',error=NULL,updated=? WHERE run_id=? AND collection=? AND movie_id=?")
              .bind(nowMs(), run.id, collection.collection, item.movie_id),
          ], budget);
          recordMovieChange(report, Boolean(existing));
          continue;
        }
        await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
        await dbRun(db, "UPDATE discovery_sync_items SET state='complete',error=NULL,updated=? WHERE run_id=? AND collection=? AND movie_id=?", budget, nowMs(), run.id, collection.collection, item.movie_id);
      } catch (error) {
        const code = error instanceof TmdbError ? error.code : "SYNC_FAILED";
        await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
        await dbRun(db, "UPDATE discovery_sync_items SET state='failed',retry_count=retry_count+1,error=?,updated=? WHERE run_id=? AND collection=? AND movie_id=?", budget, code, nowMs(), run.id, collection.collection, item.movie_id);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, items.length) }, () => worker()));
  const last = items[items.length - 1];
  await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
  await dbRun(db, "UPDATE discovery_sync_collections SET detail_cursor=?,updated=? WHERE run_id=? AND collection=?", budget, last.rank + 1, nowMs(), run.id, collection.collection);
  return true;
}

const PUBLICATION_BATCH_SIZE = 8;

async function stagePublicationBatch(
  db: D1Database,
  run: RunRow,
  collection: CollectionRow,
  spec: CollectionSpec,
  budget: RequestBudget,
  lease: CatalogueLease,
) {
  const rows = await dbAll<{ rank: number; document: string }>(db,
    "SELECT i.rank,m.document FROM discovery_sync_items i JOIN discovery_movies m ON m.id=i.movie_id WHERE i.run_id=? AND i.collection=? AND i.state='complete' AND i.rank>=? ORDER BY i.rank LIMIT ?",
    budget, run.id, collection.collection, collection.detail_cursor, PUBLICATION_BATCH_SIZE);
  if (!rows.length) return false;
  const movies = rows
    .map((row) => ({ rank: row.rank, movie: JSON.parse(row.document) as Movie }))
    .filter((row) => qualifies(row.movie, spec, indiaToday(new Date(run.started))));
  await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
  if (movies.length) {
    const statements = movies.map(({ rank, movie }) =>
      db.prepare("INSERT OR REPLACE INTO discovery_memberships(collection,generation,movie_id,rank,last_seen) VALUES(?,?,?,?,?)")
        .bind(spec.id, collection.generation, movie.metadata!.tmdbId, rank, nowMs()));
    await dbBatch(db, statements, budget);
  }
  await dbRun(
    db,
    "UPDATE discovery_sync_collections SET detail_cursor=?,updated=? WHERE run_id=? AND collection=?",
    budget,
    rows[rows.length - 1].rank + 1,
    nowMs(),
    run.id,
    collection.collection,
  );
  return true;
}

async function swapPublishedGeneration(
  db: D1Database,
  run: RunRow,
  collection: CollectionRow,
  report: SyncReport,
  budget: RequestBudget,
  lease: CatalogueLease,
) {
  await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
  await dbBatch(db, [
    db.prepare(
      "INSERT INTO discovery_collections(id,generation,last_success,last_attempt,error) VALUES(?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,last_success=excluded.last_success,last_attempt=excluded.last_attempt,error=NULL",
    ).bind(collection.collection, collection.generation, nowMs(), nowMs()),
    db.prepare("DELETE FROM discovery_memberships WHERE collection=? AND generation<>?")
      .bind(collection.collection, collection.generation),
    db.prepare("UPDATE discovery_sync_collections SET status='completed',updated=? WHERE run_id=? AND collection=?")
      .bind(nowMs(), run.id, collection.collection),
  ], budget);
  report.completedCollections++;
}

export async function advanceCatalogueSync(
  db: D1Database,
  settings: TmdbSettings,
  kind: "full" | "trending",
  options: { runId?: string; diagnostics?: (diagnostic: TmdbDiagnostic) => void } = {},
) {
  const run = await startOrResumeCatalogueRun(db, kind, options.runId);
  if (run.status !== "running") return { runId: run.id, status: run.status, complete: true };
  const budget: RequestBudget = { used: 0 };
  const lease = await acquireCatalogueLease(db, run.id, nowMs(), () => consume(budget));
  let batchId: string | null = null;
  try {
    const current = (await getRun(db, run.id, budget))!;
    const report = readReport(current.report);
    if (!report.genres) {
      batchId = await beginBatch(db, run.id, null, "genres", budget);
      let parsedGenres: ReturnType<typeof genreSchema.parse> | undefined;
      const result = await request("genre/movie/list", { language: "en-US" }, settings, (value) => {
        const parsed = genreSchema.safeParse(value);
        if (parsed.success) parsedGenres = parsed.data;
        return parsed.success;
      }, diagnosticContext(undefined, "genre-list", options.diagnostics), budget);
      report.genres = Object.fromEntries((parsedGenres ?? genreSchema.parse(result.data)).genres.map((genre) => [String(genre.id), genre.name]));
      await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
      await dbRun(db, "UPDATE discovery_sync_runs SET report=? WHERE id=?", budget, JSON.stringify(report), run.id);
      await finishBatch(db, batchId, "completed", null, budget);
      return { runId: run.id, status: "running", phase: "genres", complete: false, report };
    }
    const rows = await getCollections(db, run.id, budget);
    const plan = collectionPlan(run.kind, new Date(report.startedAt));
    const collection = plan
      .map((spec) => rows.find((row) => row.collection === spec.id))
      .find((row): row is CollectionRow => Boolean(row && (row.status === "pending" || row.status === "in_progress" || row.status === "publishing")));
    if (!collection) {
      await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
      await dbRun(db, "UPDATE discovery_sync_runs SET status='success',finished=?,report=? WHERE id=?", budget, nowMs(), JSON.stringify(report), run.id);
      return { runId: run.id, status: "success", complete: true, report };
    }
    const spec = plan.find((candidate) => candidate.id === collection.collection);
    if (!spec) throw new Error(`Collection plan no longer contains ${collection.collection}.`);
    if (collection.status === "pending") {
      await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
      await dbRun(db, "UPDATE discovery_sync_collections SET status='in_progress',updated=? WHERE run_id=? AND collection=?", budget, nowMs(), run.id, collection.collection);
    }
    const pageLimit = Math.min(collection.total_pages ?? collection.planned_pages, collection.planned_pages);
    if (collection.status === "publishing") {
      batchId = await beginBatch(db, run.id, collection.collection, "publication", budget);
      if (await stagePublicationBatch(db, run, collection, spec, budget, lease)) {
        await finishBatch(db, batchId, "completed", null, budget);
        return { runId: run.id, status: "running", phase: "publication", collection: collection.collection, complete: false, report };
      }
      await swapPublishedGeneration(db, run, collection, report, budget, lease);
      await finishBatch(db, batchId, "completed", null, budget);
      await dbRun(db, "UPDATE discovery_sync_runs SET report=? WHERE id=?", budget, JSON.stringify(report), run.id);
      return { runId: run.id, status: "running", phase: "published", collection: collection.collection, complete: false, report };
    }
    if (collection.next_page <= pageLimit) {
      batchId = await beginBatch(db, run.id, collection.collection, "page", budget);
      const page = collection.next_page;
      let parsedPage: ReturnType<typeof pageSchema.parse> | undefined;
      const result = await request(spec.path, { language: "en-US", ...spec.params, page: String(page) }, settings, (value) => {
        const parsed = pageSchema.safeParse(value);
        if (parsed.success && parsed.data.page === page) parsedPage = parsed.data;
        return parsed.success && parsed.data.page === page;
      }, diagnosticContext(spec, "collection-page", options.diagnostics), budget);
      const data = parsedPage ?? pageSchema.parse(result.data);
      if (data.total_pages > 0 && data.results.length === 0) throw new Error("Incomplete provider page; previous collection retained.");
      const statements = data.results.filter((movie) => !movie.adult).map((movie, index) =>
        db.prepare("INSERT OR IGNORE INTO discovery_sync_items(run_id,collection,movie_id,rank,updated) VALUES(?,?,?,?,?)")
          .bind(run.id, collection.collection, movie.id, (page - 1) * 20 + index, nowMs()));
      await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
      for (let offset = 0; offset < statements.length; offset += 80) await dbBatch(db, statements.slice(offset, offset + 80), budget);
      await dbBatch(db, [
        db.prepare("UPDATE discovery_sync_collections SET next_page=?,total_pages=?,updated=? WHERE run_id=? AND collection=?")
          .bind(page + 1, Math.min(data.total_pages || spec.pages, spec.pages), nowMs(), run.id, collection.collection),
        finishBatchStatement(db, batchId, "completed", null),
      ], budget);
      return { runId: run.id, status: "running", phase: "page", collection: collection.collection, page, complete: false, report };
    }
    const terminalFailure = await dbFirst<{ count: number }>(db, "SELECT count(*) AS count FROM discovery_sync_items WHERE run_id=? AND collection=? AND state='failed' AND retry_count>=?", budget, run.id, collection.collection, MAX_ITEM_RETRIES);
    if (terminalFailure?.count) {
      batchId = await beginBatch(db, run.id, collection.collection, "details", budget);
      await updateFailure(db, run.id, collection, new Error("Detail retries exhausted."), report, budget);
      await finishBatch(db, batchId, "failed", "DETAIL_RETRIES_EXHAUSTED", budget);
      await dbRun(db, "UPDATE discovery_sync_runs SET status='failed',finished=?,report=? WHERE id=?", budget, nowMs(), JSON.stringify(report), run.id);
      return { runId: run.id, status: "failed", collection: collection.collection, complete: true, report };
    }
    batchId = await beginBatch(db, run.id, collection.collection, "details", budget);
    if (await processDetails(db, current, collection, spec, settings, report, budget, lease, options.diagnostics)) {
      await dbRun(db, "UPDATE discovery_sync_runs SET report=? WHERE id=?", budget, JSON.stringify(report), run.id);
      await finishBatch(db, batchId, "completed", null, budget);
      return { runId: run.id, status: "running", phase: "details", collection: collection.collection, complete: false, report };
    }
    await finishBatch(db, batchId, "completed", null, budget);
    await assertCatalogueLease(db, lease, nowMs(), () => consume(budget));
    await dbRun(db, "UPDATE discovery_sync_collections SET status='publishing',detail_cursor=0,updated=? WHERE run_id=? AND collection=?", budget, nowMs(), run.id, collection.collection);
    batchId = await beginBatch(db, run.id, collection.collection, "publication", budget);
    await finishBatch(db, batchId, "completed", null, budget);
    return { runId: run.id, status: "running", phase: "publication", collection: collection.collection, complete: false, report };
  } catch (error) {
    await assertCatalogueLease(db, lease);
    const current = (await getRun(db, run.id))!;
    const report = readReport(current.report);
    const collection = (await getCollections(db, run.id)).find((row) => row.status === "in_progress");
    if (batchId) await finishBatch(db, batchId, "failed", error instanceof Error ? error.message : "SYNC_FAILED", budget);
    if (collection) await updateFailure(db, run.id, collection, error, report);
    await db.prepare("UPDATE discovery_sync_runs SET status='failed',finished=?,report=? WHERE id=?").bind(nowMs(), JSON.stringify({ ...report, error: error instanceof TmdbError ? error.code : "SYNC_FAILED" }), run.id).run();
    throw error;
  } finally {
    await releaseCatalogueLease(db, lease, () => consume(budget));
  }
}

export async function resumableCatalogueStatus(db: D1Database, runId?: string) {
  const run = runId
    ? await getRun(db, runId)
    : await db.prepare("SELECT * FROM discovery_sync_runs ORDER BY started DESC LIMIT 1").first<RunRow>();
  if (!run) return { current: null };
  const collections = await getCollections(db, run.id);
  const pending = collections.find((row) => row.status === "pending" || row.status === "in_progress");
  const batches = (await db.prepare("SELECT collection,kind,status,count(*) AS count FROM discovery_sync_batches WHERE run_id=? GROUP BY collection,kind,status").bind(run.id).all<{ collection: string | null; kind: string; status: string; count: number }>()).results;
  const itemProgress = (await db.prepare("SELECT collection,state,count(*) AS count FROM discovery_sync_items WHERE run_id=? GROUP BY collection,state").bind(run.id).all<{ collection: string; state: string; count: number }>()).results;
  const collectionProgress = collections.map((row) => ({
    collection: row.collection,
    status: row.status,
    page: { completed: Math.min(Math.max(row.next_page - 1, 0), Math.min(row.total_pages ?? row.planned_pages, row.planned_pages)), planned: Math.min(row.total_pages ?? row.planned_pages, row.planned_pages) },
    details: {
      pending: itemProgress.find((item) => item.collection === row.collection && item.state === "pending")?.count ?? 0,
      completed: itemProgress.find((item) => item.collection === row.collection && item.state === "complete")?.count ?? 0,
      failed: itemProgress.find((item) => item.collection === row.collection && item.state === "failed")?.count ?? 0,
    },
    retryCount: row.retry_count,
    error: row.error,
  }));
  return {
    current: { id: run.id, kind: run.kind, status: run.status, started: run.started, finished: run.finished, report: readReport(run.report) },
    collections: collectionProgress,
    batches: {
      recorded: batches,
      completed: batches.filter((batch) => batch.status === "completed").reduce((sum, batch) => sum + batch.count, 0),
      failed: batches.filter((batch) => batch.status === "failed").reduce((sum, batch) => sum + batch.count, 0),
    },
    itemFailures: (await db.prepare("SELECT collection,count(*) AS count,sum(retry_count) AS retries FROM discovery_sync_items WHERE run_id=? AND state='failed' GROUP BY collection").bind(run.id).all()).results,
    nextPendingBatch: pending ? { collection: pending.collection, page: pending.next_page, detailCursor: pending.detail_cursor } : null,
  };
}
