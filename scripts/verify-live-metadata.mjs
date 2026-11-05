// Probe the actual backend, never read, print, or pass provider credentials.
const target = process.argv[2] || "http://127.0.0.1:5173";
let failed = false;
for (const section of ["trending", "now-playing", "upcoming"]) {
  try {
    const url = new URL(`/api/movie-discovery?section=${section}&language=en-IN&page=1`, target);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    const verified = response.ok && data.source === "tmdb" && data.region === "IN" && Array.isArray(data.movies) && data.movies.length > 0 && Number.isFinite(Date.parse(data.fetchedAt));
    console.log(JSON.stringify({ provider: "TMDB", section, status: verified ? "VERIFIED" : "NOT VERIFIED", httpStatus: response.status, ...(verified ? { movieCount: data.movies.length, fetchedAt: data.fetchedAt } : { reason: data.code === "TMDB_NOT_CONFIGURED" ? "MISSING CREDENTIALS" : "No successful live response" }) }));
    if (!verified) failed = true;
  } catch { console.log(JSON.stringify({ provider: "TMDB", section, status: "NOT VERIFIED", reason: "Backend unavailable" })); failed = true; }
}
process.exitCode = failed ? 2 : 0;
