import { expect, it } from "vitest";
import { readRequestJson } from "../lib/request-json";

const request = (body: string) =>
  new Request("https://movieverse.test/api/checkout", { method: "POST", body });

it("reads Unicode JSON using actual bytes and accepts a body at the limit", async () => {
  const body = JSON.stringify({ name: "सिनेमा" });
  const bytes = new TextEncoder().encode(body).length;
  expect(await readRequestJson(request(body), bytes)).toEqual({
    name: "सिनेमा",
  });
  await expect(readRequestJson(request(body), bytes - 1)).rejects.toMatchObject(
    { status: 413 },
  );
});

it("rejects oversized streamed JSON even with no Content-Length header", async () => {
  const req = request(JSON.stringify({ cart: "x".repeat(40_001) }));
  expect(req.headers.has("content-length")).toBe(false);
  await expect(readRequestJson(req)).rejects.toMatchObject({
    message: "Request too large.",
    status: 413,
  });
});

it("reports missing and malformed bodies as expected client errors", async () => {
  await expect(
    readRequestJson(new Request("https://movieverse.test")),
  ).rejects.toMatchObject({ status: 400 });
  await expect(readRequestJson(request('{"cart":'))).rejects.toMatchObject({
    message: "Please send valid JSON.",
    status: 400,
  });
});
