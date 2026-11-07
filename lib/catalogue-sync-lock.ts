export const CATALOGUE_LEASE_MS = 90_000;

export class CatalogueSyncBusyError extends Error {
  readonly status = 409;

  constructor() {
    super("A catalogue synchronization is already running.");
    this.name = "CatalogueSyncBusyError";
  }
}

export class CatalogueSyncOwnershipError extends Error {
  readonly status = 409;

  constructor() {
    super("This catalogue synchronization no longer owns the coordination lease.");
    this.name = "CatalogueSyncOwnershipError";
  }
}

export type CatalogueLease = {
  owner: string;
  fence: number;
  expires: number;
};

async function activeRun(db: D1Database, owner: string) {
  return db.prepare(
    "SELECT id FROM discovery_sync_runs WHERE status='running' AND id<>? ORDER BY started ASC LIMIT 1",
  ).bind(owner).first<{ id: string }>();
}

export async function acquireCatalogueLease(
  db: D1Database,
  owner: string,
  now = Date.now(),
  charge?: () => void,
) {
  charge?.();
  if (await activeRun(db, owner)) throw new CatalogueSyncBusyError();
  charge?.();
  const result = await db.prepare(
    "INSERT INTO discovery_sync_lock(id,owner,expires,fence) VALUES(1,?,?,1) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires,fence=discovery_sync_lock.fence+1 WHERE discovery_sync_lock.expires<? AND NOT EXISTS (SELECT 1 FROM discovery_sync_runs WHERE status='running' AND id<>?)",
  ).bind(owner, now + CATALOGUE_LEASE_MS, now, owner).run();
  if (!result.meta.changes) throw new CatalogueSyncBusyError();
  charge?.();
  const lease = await db.prepare("SELECT owner,fence,expires FROM discovery_sync_lock WHERE id=1").first<CatalogueLease>();
  if (!lease || lease.owner !== owner) throw new CatalogueSyncOwnershipError();
  return lease;
}

export async function renewCatalogueLease(
  db: D1Database,
  lease: CatalogueLease,
  now = Date.now(),
  charge?: () => void,
) {
  charge?.();
  const result = await db.prepare(
    "UPDATE discovery_sync_lock SET expires=? WHERE id=1 AND owner=? AND fence=? AND expires>=?",
  ).bind(now + CATALOGUE_LEASE_MS, lease.owner, lease.fence, now).run();
  if (!result.meta.changes) throw new CatalogueSyncOwnershipError();
  lease.expires = now + CATALOGUE_LEASE_MS;
}

export async function assertCatalogueLease(
  db: D1Database,
  lease: CatalogueLease,
  now = Date.now(),
  charge?: () => void,
) {
  charge?.();
  const current = await db.prepare(
    "SELECT owner,fence,expires FROM discovery_sync_lock WHERE id=1 AND owner=? AND fence=? AND expires>=?",
  ).bind(lease.owner, lease.fence, now).first<CatalogueLease>();
  if (!current) throw new CatalogueSyncOwnershipError();
}

export async function releaseCatalogueLease(db: D1Database, lease: CatalogueLease, charge?: () => void) {
  charge?.();
  await db.prepare(
    "DELETE FROM discovery_sync_lock WHERE id=1 AND owner=? AND fence=?",
  ).bind(lease.owner, lease.fence).run();
}
