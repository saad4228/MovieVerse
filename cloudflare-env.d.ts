declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TMDB_READ_TOKEN?: string;
    TMDB_API_KEY?: string;
    ADMIN_TOKEN?: string;
    SHOWTIMES_MODE?: string;
    LIVE_SHOWTIMES_ENDPOINT?: string;
    LIVE_SHOWTIMES_TOKEN?: string;
    LIVE_SHOWTIMES_APPROVED?: string;
  }
}
