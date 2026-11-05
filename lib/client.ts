export type SessionResponse = {
  user: { id: string; name: string; email: string } | null;
};

let bootstrap: Promise<SessionResponse> | null = null;

export function invalidateSession() {
  bootstrap = null;
}

async function responseData<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => {
    throw new Error(
      "The server returned an unreadable response. Please try again.",
    );
  });
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return data as T;
}

function ensureSession() {
  if (!bootstrap) {
    const request = fetch("/api/session", { cache: "no-store" })
      .then((response) => responseData<SessionResponse>(response))
      .catch((error) => {
        // A request from before login must not clear the newer session request.
        if (bootstrap === request) bootstrap = null;
        throw error;
      });
    bootstrap = request;
  }
  return bootstrap;
}

export function api(action: "session"): Promise<SessionResponse>;
export function api<T = unknown>(action: string, body?: unknown): Promise<T>;
export async function api<T = unknown>(
  action: string,
  body?: unknown,
): Promise<T | SessionResponse> {
  if (action === "session") return ensureSession();
  if (action !== "catalog") await ensureSession();
  const response = await fetch(
    `/api/${action}`,
    body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await responseData<T>(response);
  if (["logout", "login", "register"].includes(action)) invalidateSession();
  return data;
}
