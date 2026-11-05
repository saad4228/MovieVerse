let bootstrap: Promise<any> | null = null;
export function invalidateSession(){bootstrap=null;}
async function ensureSession() {
  if (!bootstrap)
    bootstrap = fetch("/api/session", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to initialise your session.");
        return r.json();
      })
      .catch((e) => {
        bootstrap = null;
        throw e;
      });
  return bootstrap;
}
export async function api<T = any>(action: string, body?: unknown): Promise<T> {
  if (action === "session") return ensureSession() as Promise<T>;
  if (action !== "catalog" && action !== "session") await ensureSession();
  const res = await fetch(
    `/api/${action}`,
    body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  if (["logout", "login", "register"].includes(action)) bootstrap = null;
  return data as T;
}
