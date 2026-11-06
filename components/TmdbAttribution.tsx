import AssetImage from "./AssetImage";
export function TmdbAttribution() {
  return (
    <aside
      className="metadata-credit tmdb-attribution"
      aria-label="TMDB credits"
    >
      <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
        <AssetImage src="/assets/tmdb-logo.svg" alt="TMDB" width={100} height={13} />
      </a>
      <p>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </aside>
  );
}
