import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceCatalogueSync, DETAIL_BATCH_SIZE, DETAIL_CONCURRENCY, MAX_EXTERNAL_SUBREQUESTS, MAX_TOTAL_SUBREQUESTS, startOrResumeCatalogueRun } from "../lib/catalogue-sync-resumable";
import { discoveryDb } from "./helpers/discovery-db";

const raw = (id: number) => ({
  id,
  title: `Film ${id}`,
  original_title: `Original ${id}`,
  overview: "A fixture film",
  origin_country: ["US"],
  original_language: "en",
  release_date: "2020-01-01",
  genres: [{ id: 28, name: "Action" }],
  genre_ids: [28],
  vote_count: 1000,
  vote_average: 8,
  popularity: 100,
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  release_dates: { results: [{ iso_3166_1: "IN", release_dates: [{ type: 3, release_date: "2020-01-01T00:00:00Z" }] }] },
});

afterEach(() => vi.unstubAllGlobals());
const settings = { TMDB_READ_TOKEN: ["fixture", "tmdb", "value"].join("-") };

function provider(pageCount = 2, ids = [1, 2, 3, 4]) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    calls.push(input);
    const url = new URL(input);
    if (url.pathname.endsWith("genre/movie/list"))
      return Response.json({ genres: [{ id: 28, name: "Action" }] });
    if (/\/movie\/\d+$/.test(url.pathname))
      return Response.json(raw(Number(url.pathname.split("/").pop())));
    const page = Number(url.searchParams.get("page") ?? 1);
    return Response.json({
      page,
      total_pages: pageCount,
      total_results: ids.length,
      results: page <= pageCount ? ids.map(raw) : [],
    });
  }));
  return calls;
}

describe("resumable catalogue synchronization", () => {
  it("enforces one bounded page or detail batch per continuation", async () => {
    const { db, sqlite } = discoveryDb();
    const calls = provider(1, Array.from({ length: DETAIL_BATCH_SIZE }, (_, index) => index + 1));
    const first = await advanceCatalogueSync(db, settings, "trending");
    expect(first.phase).toBe("genres");
    const page = await advanceCatalogueSync(db, settings, "trending", { runId: first.runId });
    expect(page.phase).toBe("page");
    const beforeDetails = calls.length;
    const details = await advanceCatalogueSync(db, settings, "trending", { runId: first.runId });
    expect(details.phase).toBe("details");
    expect(calls.length - beforeDetails).toBeLessThanOrEqual(MAX_EXTERNAL_SUBREQUESTS);
    expect(MAX_TOTAL_SUBREQUESTS).toBe(35);
    expect(DETAIL_BATCH_SIZE).toBe(1);
    expect(DETAIL_CONCURRENCY).toBe(4);
    expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_sync_items WHERE run_id=?").get(first.runId)?.n).toBe(DETAIL_BATCH_SIZE);
    expect(new Set(sqlite.prepare("SELECT movie_id FROM discovery_sync_items WHERE run_id=?").all(first.runId).map((row) => row.movie_id)).size).toBe(DETAIL_BATCH_SIZE);
    sqlite.close();
  });

  it("resumes a run after interruption and publishes only completed collections", async () => {
    const { db, sqlite } = discoveryDb();
    provider(2, [1, 2]);
    const started = await startOrResumeCatalogueRun(db, "trending");
    await advanceCatalogueSync(db, settings, "trending", { runId: started.id });
    const resumed = await advanceCatalogueSync(db, settings, "trending", { runId: started.id });
    expect(resumed.runId).toBe(started.id);
    const same = await startOrResumeCatalogueRun(db, "trending");
    expect(same.id).toBe(started.id);
    for (let i = 0; i < 30; i++) {
      const result = await advanceCatalogueSync(db, settings, "trending", { runId: started.id });
      if (result.complete) break;
    }
    expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_collections WHERE generation=?").get(started.id)?.n).toBe(2);
    expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_memberships WHERE generation=?").get(started.id)?.n).toBeGreaterThan(0);
    expect(sqlite.prepare("SELECT count(*) AS n FROM discovery_sync_batches WHERE run_id=? AND status='completed'").get(started.id)?.n).toBeGreaterThan(0);
    expect(sqlite.prepare("SELECT status FROM discovery_sync_runs WHERE id=?").get(started.id)?.status).toBe("success");
    sqlite.close();
  });

  it("keeps the previous generation when a detail batch exhausts retries", async () => {
    const { db, sqlite } = discoveryDb();
    provider(1, [1]);
    const first = await advanceCatalogueSync(db, settings, "trending");
    for (let i = 0; i < 20; i++) {
      const result = await advanceCatalogueSync(db, settings, "trending", { runId: first.runId });
      if (result.complete) break;
    }
    const previous = sqlite.prepare("SELECT generation FROM discovery_collections WHERE id='trending-day'").get()?.generation;
    sqlite.prepare("UPDATE discovery_movies SET updated=0").run();
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("genre/movie/list")) return Response.json({ genres: [{ id: 28, name: "Action" }] });
      if (/\/movie\/\d+$/.test(url.pathname)) return Response.json({ error: "provider failure" }, { status: 500 });
      return Response.json({ page: 1, total_pages: 1, total_results: 1, results: [raw(1)] });
    }));
    const second = await advanceCatalogueSync(db, settings, "trending");
    for (let i = 0; i < 20; i++) {
      const result = await advanceCatalogueSync(db, settings, "trending", { runId: second.runId });
      if (result.complete) break;
    }
    expect(sqlite.prepare("SELECT generation FROM discovery_collections WHERE id='trending-day'").get()?.generation).toBe(previous);
    expect(sqlite.prepare("SELECT status FROM discovery_sync_runs WHERE id=?").get(second.runId)?.status).toBe("failed");
    sqlite.close();
  });
});
