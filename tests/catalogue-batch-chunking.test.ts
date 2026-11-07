import { describe, expect, it, vi } from "vitest";
import { MAX_NODE_BATCH_BYTES, chunkPayloadItems, payloadBytes, sendChunked, uploadCollection } from "../scripts/catalogue-batch-chunking.mjs";

const item = (size: number) => ({ movieId: size, document: "x".repeat(size) });

describe("external catalogue batch chunking", () => {
  it("keeps every chunk below the Worker request limit", () => {
    const chunks = chunkPayloadItems({ runId: "run", collection: "trending-day" }, "movies", [
      item(7_000), item(7_000), item(7_000), item(7_000),
    ]);
    expect(chunks.length).toBe(2);
    for (const chunk of chunks)
      expect(payloadBytes(chunk)).toBeLessThanOrEqual(MAX_NODE_BATCH_BYTES);
  });

  it("preserves item order and exact chunk boundaries", () => {
    const chunks = chunkPayloadItems({ runId: "run" }, "movies", [item(12_000), item(12_000), item(1_000)]);
    expect(chunks.flatMap(chunk => chunk.movies.map((movie: { movieId: number }) => movie.movieId))).toEqual([12_000, 12_000, 1_000]);
    expect(chunks.map(chunk => chunk.movies.length)).toEqual([1, 2]);
  });

  it("rejects an item that cannot fit", () => {
    expect(() => chunkPayloadItems({}, "movies", [item(MAX_NODE_BATCH_BYTES)])).toThrow(/exceeds/);
  });

  it("stops after a failed chunk so publication cannot follow it", async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("ingestion failed"));
    await expect(sendChunked(send, { runId: "run" }, "movies", [item(10_000), item(10_000), item(10_000)])).rejects.toThrow("ingestion failed");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("publishes only after all movie chunks and memberships succeed", async () => {
    const stages: string[] = [];
    await uploadCollection({
      send: async (stage: string) => { stages.push(stage); },
      collection: "trending-day",
      movies: [item(12_000), item(12_000), item(1_000)],
      eligible: [{ movieId: 1, rank: 0 }],
    });
    expect(stages).toEqual(["movies", "movies", "membership", "publish"]);
  });

  it("does not publish after a failed movie chunk", async () => {
    const stages: string[] = [];
    await expect(uploadCollection({
      send: async (stage: string) => {
        stages.push(stage);
        if (stage === "movies" && stages.length === 2) throw new Error("ingestion failed");
      },
      collection: "trending-day",
      movies: [item(12_000), item(12_000), item(1_000)],
      eligible: [{ movieId: 1, rank: 0 }],
    })).rejects.toThrow("ingestion failed");
    expect(stages).toEqual(["movies", "movies"]);
  });
});
