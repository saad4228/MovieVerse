import { expect, it, vi } from "vitest";
vi.mock("vinext/server/fetch-handler", () => ({ default: { fetch: vi.fn() } }));
import worker from "../worker/index";

it("keeps Worker Cron handlers lightweight and delegates catalogue work to Node", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const waitUntil = vi.fn();
  for (const cron of ["0 3 * * *", "0 */6 * * *", "*/5 * * * *"]) {
    await worker.scheduled({ cron } as ScheduledController, {}, { waitUntil } as unknown as ExecutionContext);
  }
  expect(waitUntil).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledTimes(3);
  expect(log.mock.calls.every(([message]) => String(message).includes("node-importer-required"))).toBe(true);
  log.mockRestore();
});
