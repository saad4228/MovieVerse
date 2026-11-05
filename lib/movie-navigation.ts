const base = "https://movieverse.invalid";
const scrollKey = "movieverse-browse-scroll";
const navigationKey = "movieverse-movie-navigation";

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || value.length > 4096 || !value.startsWith("/") || value.startsWith("//")) return "/movies";
  try {
    if (/[\\\u0000-\u001f]/.test(decodeURIComponent(value))) return "/movies";
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/movies";
  } catch { return "/movies"; }
}

export function movieHref(href: string, source: string): string {
  if (!/^\/movies\/[^/?#]+(?:[?#]|$)/.test(href)) return href;
  const url = new URL(href, base);
  url.searchParams.set("returnTo", safeReturnTo(source));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function rememberScroll(url = location.pathname + location.search + location.hash) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(scrollKey) || "{}") as Record<string, number>;
    delete saved[url];
    const recent = Object.entries(saved).slice(-49);
    sessionStorage.setItem(scrollKey, JSON.stringify({...Object.fromEntries(recent), [url]: window.scrollY}));
  } catch { /* Navigation works when storage is unavailable. */ }
}

export function savedScroll(url: string): number | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(scrollKey) || "{}")[url];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
  } catch { return undefined; }
}

export function rememberMovieNavigation(destination: string, source: string) {
  rememberScroll(source);
  try { sessionStorage.setItem(navigationKey, JSON.stringify({destination, source: safeReturnTo(source)})); } catch {}
}

export function consumeMovieNavigation(destination: string, source: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(navigationKey) || "null");
    sessionStorage.removeItem(navigationKey);
    return saved?.destination === destination && saved?.source === source;
  } catch { return false; }
}
