import type { Movie } from "../catalog";
import { directSources } from "./sources";
import { playbackDiagnostic } from "./diagnostics";

let prepared: { movieId: string; url: string; video: HTMLVideoElement; timer: ReturnType<typeof setTimeout> } | undefined;
export function createMovieVideo() {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.loop = true;
  video.preload = "auto";
  return video;
}
function discard() {
  if (!prepared) return;
  clearTimeout(prepared.timer);
  prepared.video.pause();
  prepared.video.removeAttribute("src");
  prepared.video.load();
  prepared = undefined;
}
/** Called synchronously from the showtime click, before the booking route loads. */
export function prepareAuditoriumPlayback(movie: Movie) {
  discard();
  const source = directSources(movie)[0];
  if (!source || source.provider !== "direct-mp4") return;
  const video = createMovieVideo();
  video.src = source.url;
  video.load();
  prepared = { movieId: movie.id, url: source.url, video, timer: setTimeout(discard, 30000) };
  playbackDiagnostic(movie, "entry-gesture-preload", { sourceType: source.provider, urlAvailable: true });
  void video.play().then(() => playbackDiagnostic(movie, "entry-gesture-playing"))
    .catch((error: DOMException) => playbackDiagnostic(movie, "entry-gesture-rejected", { reason: error.name }));
}
export function claimPreparedVideo(movie: Movie) {
  if (!prepared || prepared.movieId !== movie.id || directSources(movie)[0]?.url !== prepared.url) return null;
  clearTimeout(prepared.timer);
  const video = prepared.video;
  prepared = undefined;
  return video;
}
