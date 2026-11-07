import { z } from "zod";
import {
  cataloguePage,
  catalogueHome,
  catalogueStatus,
  databaseGenres,
  databaseGenrePage,
} from "./catalogue-read";
import { syncCatalogue } from "./catalogue-sync";
import {
  advanceCatalogueSync,
  resumableCatalogueStatus,
  startOrResumeCatalogueRun,
} from "./catalogue-sync-resumable";
import { genreQuery } from "./genre-catalog";
import { collectionPlan } from "./discovery-collections";
import { readRequestJson, RequestError } from "./request-json";
import { genreSchema, tmdbRequest, TmdbError, type TmdbDiagnostic } from "./tmdb";
import { CatalogueSyncBusyError, CatalogueSyncOwnershipError } from "./catalogue-sync-lock";
import { acquireCatalogueLease, assertCatalogueLease, releaseCatalogueLease } from "./catalogue-sync-lock";
import type { Movie } from "./catalog";
export async function catalogueApi(
  req: Request,
  action: string,
  env: Cloudflare.Env,
): Promise<Response | null> {
  const actions = [
    "catalogue",
    "discovery-home",
    "catalogue-search",
    "catalogue-sync",
    "catalogue-diagnostic",
    "catalogue-status",
    "catalogue-pins",
    "movie-genres",
    "genre-movies",
    "tmdb-movie",
    "movie-discovery",
  ];
  if (!actions.includes(action)) return null;
  const url = new URL(req.url),
    db = env.DB;
  const protectedRoute = [
    "catalogue-sync",
    "catalogue-diagnostic",
    "catalogue-status",
    "catalogue-pins",
  ].includes(action);
  if (
    protectedRoute &&
    (!env.ADMIN_TOKEN ||
      req.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`)
  )
    return Response.json(
      { error: "Administrator authorization required." },
      { status: 403 },
    );
  if (!db)
    return Response.json(
      { error: "Movie catalogue storage is unavailable." },
      { status: 503 },
    );
  const respond = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: {
        "Cache-Control":
          protectedRoute || status !== 200
            ? "no-store"
            : "public, max-age=120, stale-while-revalidate=60",
      },
    });
  try {
    const logTmdbDiagnostic = (diagnostic: TmdbDiagnostic) =>
      console.log(JSON.stringify({ event: "tmdb-request", ...diagnostic }));
    if (action === "catalogue-diagnostic" && req.method === "POST") {
      const diagnostics: TmdbDiagnostic[] = [];
      try {
        await tmdbRequest(
          "genre/movie/list",
          { language: "en-US" },
          env,
          0,
          (value) => genreSchema.safeParse(value).success,
          {
            stage: "protected-diagnostic",
            log: (diagnostic) => {
              diagnostics.push(diagnostic);
              logTmdbDiagnostic(diagnostic);
            },
          },
        );
        return respond({ ok: true, message: "TMDB diagnostic request succeeded.", diagnostic: diagnostics.at(-1) });
      } catch (error) {
        if (error instanceof TmdbError)
          return respond({
            ok: false,
            error: {
              code: error.code,
              category: error.diagnostic?.category ?? "provider",
              diagnostic: error.diagnostic,
            },
          }, error.status);
        throw error;
      }
    }
    if (action === "catalogue-status" && req.method === "GET")
      return respond({
        ...(await catalogueStatus(db)),
        resumable: await resumableCatalogueStatus(db),
      });
    if (action === "catalogue-sync" && req.method === "POST") {
      const body = z
        .object({
          kind: z.enum(["full", "trending"]),
          operation: z.enum(["plan", "start", "next", "resume", "status", "refresh", "complete", "node-batch"]).default("refresh"),
          collection: z.string().max(80).optional(),
          runId: z.string().uuid().optional(),
          runs: z.array(z.string().uuid()).max(100).optional(),
        })
        .passthrough()
        .parse(await readRequestJson(req));
      if (body.operation === "node-batch") {
        const batch = z.object({
          kind: z.enum(["full", "trending"]),
          runId: z.string().uuid(),
          stage: z.enum(["genres", "page", "movies", "membership", "publish", "complete"]),
          collection: z.string().max(80).optional(),
          page: z.number().int().positive().optional(),
          totalPages: z.number().int().positive().optional(),
          cursor: z.number().int().nonnegative().optional(),
          genres: z.record(z.string(), z.string()).optional(),
          items: z.array(z.object({ movieId: z.number().int().positive(), rank: z.number().int().nonnegative() })).max(40).optional(),
          movies: z.array(z.object({
            movieId: z.number().int().positive(),
            rank: z.number().int().nonnegative(),
            document: z.record(z.string(), z.unknown()),
            popularity: z.number().finite().optional(),
            voteCount: z.number().int().nonnegative().optional(),
          })).max(40).optional(),
        }).parse(body);
        const lease = await acquireCatalogueLease(db, batch.runId);
        try {
          await assertCatalogueLease(db, lease);
          const run = await db.prepare("SELECT report FROM discovery_sync_runs WHERE id=? AND kind=? AND status='running'")
            .bind(batch.runId, batch.kind).first<{ report: string }>();
          if (!run) return respond({ error: "Catalogue run is not active." }, 409);
          if (batch.stage === "genres") {
            if (!batch.genres) throw new RequestError("Genres are required.", 400);
            const report = JSON.parse(run.report) as Record<string, unknown>;
            report.genres = batch.genres;
            await db.prepare("UPDATE discovery_sync_runs SET report=? WHERE id=?").bind(JSON.stringify(report), batch.runId).run();
          } else if (batch.stage === "page") {
            if (!batch.collection || !batch.page || !batch.items) throw new RequestError("Page batch is incomplete.", 400);
            await db.batch([
              ...batch.items.map(item => db.prepare("INSERT OR IGNORE INTO discovery_sync_items(run_id,collection,movie_id,rank,updated) VALUES(?,?,?,?,?)")
                .bind(batch.runId, batch.collection, item.movieId, item.rank, Date.now())),
              db.prepare("UPDATE discovery_sync_collections SET status='in_progress',next_page=?,total_pages=?,updated=? WHERE run_id=? AND collection=?")
                .bind(batch.page + 1, batch.totalPages ?? batch.page, Date.now(), batch.runId, batch.collection),
            ]);
          } else if (batch.stage === "movies") {
            if (!batch.collection || !batch.movies) throw new RequestError("Movie batch is incomplete.", 400);
            await db.batch(batch.movies.flatMap(item => {
              const movie = item.document as unknown as Movie;
              const origins = movie.originCountries?.length ? movie.originCountries : (movie.productionCountries ?? []);
              return [
                db.prepare("INSERT INTO discovery_movies(id,document,title,release_date,language,origins,genres,popularity,rating,votes,runtime,india_release,us_release,first_imported,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,title=excluded.title,release_date=excluded.release_date,language=excluded.language,origins=excluded.origins,genres=excluded.genres,popularity=excluded.popularity,rating=excluded.rating,votes=excluded.votes,runtime=excluded.runtime,india_release=excluded.india_release,us_release=excluded.us_release,updated=excluded.updated")
                  .bind(item.movieId, JSON.stringify(movie), movie.title, movie.release, movie.originalLanguage ?? "", JSON.stringify(origins), JSON.stringify(movie.providerGenreIds ?? []), item.popularity ?? 0, movie.rating, item.voteCount ?? (Number(movie.votes) || 0), movie.duration, movie.metadata?.releaseDates.find(date => date.region === "IN")?.date ?? null, movie.metadata?.releaseDates.find(date => date.region === "US")?.date ?? null, Date.now(), Date.now()),
                db.prepare("UPDATE discovery_sync_items SET state='complete',error=NULL,updated=? WHERE run_id=? AND collection=? AND movie_id=?")
                  .bind(Date.now(), batch.runId, batch.collection, item.movieId),
              ];
            }));
          } else if (batch.stage === "membership") {
            if (!batch.collection || !batch.items || batch.cursor === undefined) throw new RequestError("Membership batch is incomplete.", 400);
            await db.batch([
              ...batch.items.map(item => db.prepare("INSERT OR REPLACE INTO discovery_memberships(collection,generation,movie_id,rank,last_seen) VALUES(?,?,?,?,?)")
                .bind(batch.collection, batch.runId, item.movieId, item.rank, Date.now())),
              db.prepare("UPDATE discovery_sync_collections SET status='publishing',detail_cursor=?,updated=? WHERE run_id=? AND collection=?")
                .bind(batch.cursor, Date.now(), batch.runId, batch.collection),
            ]);
          } else if (batch.stage === "publish") {
            if (!batch.collection) throw new RequestError("Collection is required.", 400);
            await assertCatalogueLease(db, lease);
            await db.batch([
              db.prepare("INSERT INTO discovery_collections(id,generation,last_success,last_attempt,error) VALUES(?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,last_success=excluded.last_success,last_attempt=excluded.last_attempt,error=NULL")
                .bind(batch.collection, batch.runId, Date.now(), Date.now()),
              db.prepare("DELETE FROM discovery_memberships WHERE collection=? AND generation<>?").bind(batch.collection, batch.runId),
              db.prepare("UPDATE discovery_sync_collections SET status='completed',updated=? WHERE run_id=? AND collection=?").bind(Date.now(), batch.runId, batch.collection),
            ]);
          } else if (batch.stage === "complete") {
            const remaining = await db.prepare("SELECT sum(CASE WHEN status<>'completed' THEN 1 ELSE 0 END) AS n, sum(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed FROM discovery_sync_collections WHERE run_id=?")
              .bind(batch.runId).first<{ n: number; completed: number }>();
            if (remaining && !remaining.n) {
              const run = await db.prepare("SELECT report FROM discovery_sync_runs WHERE id=?").bind(batch.runId).first<{ report: string }>();
              if (run) {
                const report = JSON.parse(run.report) as Record<string, unknown>;
                report.completedCollections = remaining.completed ?? 0;
                await db.prepare("UPDATE discovery_sync_runs SET status='success',finished=?,report=? WHERE id=?")
                  .bind(Date.now(), JSON.stringify(report), batch.runId).run();
              }
            }
          }
          return respond({ ok: true, stage: batch.stage, runId: batch.runId });
        } finally {
          await releaseCatalogueLease(db, lease);
        }
      }
      const plan = collectionPlan(body.kind);
      if (body.operation === "plan")
        return respond({ collections: plan.map((p) => p.id) });
      if (body.operation === "start")
        return respond(await startOrResumeCatalogueRun(db, body.kind, body.runId));
      if (body.operation === "status")
        return respond(await resumableCatalogueStatus(db, body.runId));
      if (body.operation === "next" || body.operation === "resume")
        return respond(await advanceCatalogueSync(db, env, body.kind, {
          runId: body.runId,
          diagnostics: logTmdbDiagnostic,
        }));
      if (body.operation === "complete") {
        const rows: {
          id: string;
          kind: string;
          status: string;
          started: number;
          report: string;
        }[] = [];
        for (const id of [...new Set(body.runs ?? [])]) {
          const row = await db
            .prepare("SELECT * FROM discovery_sync_runs WHERE id=?")
            .bind(id)
            .first<{
              id: string;
              kind: string;
              status: string;
              started: number;
              report: string;
            }>();
          if (row) rows.push(row);
        }
        if (
          plan.some(
            (spec) =>
              !rows.some(
                (r) =>
                  r.kind === `manual:${spec.id}` &&
                  r.status === "success" &&
                  r.started > Date.now() - 7200000,
              ),
          )
        )
          return respond(
            {
              error:
                "Not all collection refreshes completed successfully in the last two hours.",
            },
            409,
          );
        const id = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO discovery_sync_runs(id,kind,started,finished,status,report) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            id,
            body.kind,
            Math.min(...rows.map((r) => r.started)),
            Date.now(),
            "success",
            JSON.stringify({ manual: true, runs: rows.map((r) => r.id) }),
          )
          .run();
        return respond({ id, status: "success" });
      }
      if (!body.collection || !plan.some((spec) => spec.id === body.collection))
        return respond(
          {
            error:
              "Choose a collection from the protected sync plan. Use the remote sync helper for a complete refresh.",
          },
          400,
        );
      return respond(
        await syncCatalogue(db, env, body.kind, {
          collection: body.collection,
          diagnostics: logTmdbDiagnostic,
        }),
      );
    }
    if (action === "catalogue-pins" && req.method === "POST") {
      const { ids } = z
        .object({ ids: z.array(z.number().int().positive()).max(6) })
        .parse(await readRequestJson(req));
      for (const id of ids)
        if (
          !(await db
            .prepare("SELECT id FROM discovery_movies WHERE id=?")
            .bind(id)
            .first())
        )
          return respond(
            { error: "Pinned movies must already exist in the catalogue." },
            400,
          );
      await db
        .prepare(
          "INSERT INTO discovery_settings(id,document) VALUES('featured-pins',?) ON CONFLICT(id) DO UPDATE SET document=excluded.document",
        )
        .bind(JSON.stringify([...new Set(ids)]))
        .run();
      return respond({ saved: true });
    }
    if (req.method !== "GET")
      return respond({ error: "Method not allowed." }, 405);
    if (action === "movie-genres")
      return respond({ collections: databaseGenres() });
    if (action === "genre-movies")
      return respond(
        await databaseGenrePage(
          db,
          genreQuery.parse(Object.fromEntries(url.searchParams)),
        ),
      );
    if (action === "discovery-home") return respond(await catalogueHome(db));
    if (action === "tmdb-movie") {
      const id = z.coerce
        .number()
        .int()
        .positive()
        .parse(url.searchParams.get("id"));
      const row = await db
        .prepare("SELECT document,updated FROM discovery_movies WHERE id=?")
        .bind(id)
        .first<{ document: string; updated: number }>();
      return row
        ? respond({
            movie: JSON.parse(row.document),
            source: "tmdb-d1",
            fetchedAt: new Date(row.updated).toISOString(),
          })
        : respond({ error: "This movie has not been imported yet." }, 404);
    }
    const params = new URLSearchParams(url.searchParams);
    if (action === "movie-discovery") {
      const section = params.get("section") ?? "trending";
      params.set(
        "collection",
        section === "trending"
          ? `trending-${params.get("window") ?? "day"}`
          : section === "now-playing"
            ? "now-playing-IN"
            : section,
      );
    }
    if (action === "catalogue-search" && !(params.get("q") ?? "").trim())
      return respond({ movies: [] });
    return respond(await cataloguePage(db, params));
  } catch (error) {
    if (error instanceof CatalogueSyncBusyError || error instanceof CatalogueSyncOwnershipError)
      return respond({ error: error.message }, error.status);
    if (error instanceof RequestError)
      return respond({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return respond({ error: "Choose valid catalogue filters." }, 400);
    return respond(
      {
        error: protectedRoute
          ? "Synchronisation could not complete. Check protected sync status; the last successful snapshot is preserved."
          : "The movie catalogue is temporarily unavailable. Please try again.",
      },
      503,
    );
  }
}
