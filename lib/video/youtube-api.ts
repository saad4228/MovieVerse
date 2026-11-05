export type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  getVideoLoadedFraction?(): number;
};
type PlayerEvent = { target: YouTubePlayer; data: number };
export type YouTubeApi = {
  Player: new (element: HTMLIFrameElement, options: { events: {
    onReady: (event: PlayerEvent) => void;
    onStateChange: (event: PlayerEvent) => void;
    onError: (event: PlayerEvent) => void;
    onAutoplayBlocked: () => void;
  } }) => YouTubePlayer;
};
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let pending: Promise<YouTubeApi> | undefined;

/** Shared official API script, with bounded startup and no video extraction. */
export function loadYouTubeApi() {
  const target = window as YouTubeWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (pending) return pending;
  pending = new Promise<YouTubeApi>((resolve, reject) => {
    const prior = target.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      if (target.onYouTubeIframeAPIReady === callback) target.onYouTubeIframeAPIReady = prior;
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true; cleanup(); script.remove(); reject(new Error(message));
    };
    const callback = () => {
      if (settled) return;
      if (!target.YT?.Player) { fail("YouTube player unavailable."); return; }
      settled = true; cleanup(); resolve(target.YT);
      prior?.();
    };
    const timeout = setTimeout(() => fail("YouTube player did not load."), 15000);
    target.onYouTubeIframeAPIReady = callback;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => fail("YouTube could not be reached.");
    document.head.appendChild(script);
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}
