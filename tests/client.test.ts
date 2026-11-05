import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api, invalidateSession } from "../lib/client";

beforeEach(() => invalidateSession());
afterEach(() => vi.unstubAllGlobals());

it("keeps a newer session bootstrap when an invalidated request fails late", async () => {
  let rejectOld!: (error: Error) => void;
  const oldRequest = new Promise<Response>((_, reject) => {
    rejectOld = reject;
  });
  const fetcher = vi
    .fn()
    .mockReturnValueOnce(oldRequest)
    .mockResolvedValueOnce(
      Response.json({
        user: { id: "new", name: "New User", email: "new@example.test" },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const old = api("session").catch(() => undefined);
  invalidateSession();
  const current = await api("session");
  rejectOld(new Error("Old connection failed"));
  await old;
  expect(await api("session")).toEqual(current);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("retries a failed bootstrap and reports non-JSON server responses clearly", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("Upstream unavailable", { status: 502 }),
    )
    .mockResolvedValueOnce(Response.json({ user: null }));
  vi.stubGlobal("fetch", fetcher);
  await expect(api("session")).rejects.toThrow("unreadable response");
  expect(await api("session")).toEqual({ user: null });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("preserves server validation messages without accepting non-string error values", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user: null }))
      .mockResolvedValueOnce(
        Response.json({ error: "Hold expired" }, { status: 409 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { internal: "private" } }, { status: 500 }),
      ),
  );
  await expect(api("checkout", {})).rejects.toThrow("Hold expired");
  await expect(api("checkout", {})).rejects.toThrow("Something went wrong");
});
