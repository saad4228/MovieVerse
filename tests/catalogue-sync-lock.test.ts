import { describe, expect, it } from "vitest";
import {
  acquireCatalogueLease,
  assertCatalogueLease,
  CatalogueSyncBusyError,
  CatalogueSyncOwnershipError,
  renewCatalogueLease,
  releaseCatalogueLease,
} from "../lib/catalogue-sync-lock";
import { discoveryDb } from "./helpers/discovery-db";

describe("catalogue synchronization coordination", () => {
  it("rejects a second owner and fences an expired lease", async () => {
    const { db, sqlite } = discoveryDb();
    const first = await acquireCatalogueLease(db, "first", 1000);
    await expect(acquireCatalogueLease(db, "second", 1001)).rejects.toBeInstanceOf(CatalogueSyncBusyError);
    sqlite.prepare("UPDATE discovery_sync_lock SET expires=? WHERE id=1").run(900);
    const second = await acquireCatalogueLease(db, "second", 1001);
    expect(second.fence).toBeGreaterThan(first.fence);
    await expect(assertCatalogueLease(db, first, 1001)).rejects.toBeInstanceOf(CatalogueSyncOwnershipError);
    await expect(renewCatalogueLease(db, first, 1001)).rejects.toBeInstanceOf(CatalogueSyncOwnershipError);
    await releaseCatalogueLease(db, second);
    sqlite.close();
  });
});
