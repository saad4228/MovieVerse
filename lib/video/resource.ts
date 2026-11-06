import type { Movie } from "../catalog";
import { claimPreparedVideo, createMovieVideo } from "./preparation";

/** External browser resource: allocate only when React subscribes after mount,
 * and release the source owner before detaching its media element. */
export function createVideoResource(movie: Movie, auditorium: boolean, enabled: boolean) {
  let video: HTMLVideoElement | null = null;
  let sourceCleanup: { video: HTMLVideoElement; dispose: () => void } | null = null;
  return {
    attachSourceCleanup(current: HTMLVideoElement, dispose: () => void) {
      sourceCleanup = { video: current, dispose };
    },
    clearSourceCleanup(dispose: () => void) {
      if (sourceCleanup?.dispose === dispose) sourceCleanup = null;
    },
    getSnapshot: () => video,
    getServerSnapshot: () => null,
    subscribe(notify: () => void) {
      if (!enabled) return () => {};
      const current = (auditorium && claimPreparedVideo(movie)) || createMovieVideo();
      current.loop = !auditorium;
      current.setAttribute("aria-label", `${movie.title} video`);
      video = current;
      notify();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          if (sourceCleanup?.video === current) sourceCleanup.dispose();
        } finally {
          current.pause();
          current.removeAttribute("src");
          current.load();
          current.remove();
          if (video === current) video = null;
        }
      };
    },
  };
}
