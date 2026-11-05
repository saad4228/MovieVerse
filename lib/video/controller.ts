/** Provider-independent commands used by the auditorium controls. */
export type TrailerController = {
  play: () => void;
  pause: () => void;
  setMuted: (muted: boolean) => void;
  retry: () => void;
};
export type TrailerState = "idle" | "loading" | "ready" | "playing" | "buffering" | "paused" | "ended" | "error" | "blocked";

/** Fit a decoded frame without distortion. Cover crops UVs, never stretches geometry. */
export function projectionFit(width: number, height: number, aspect: number, mode: "contain" | "cover" = "contain") {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const aperture = width / height;
  if (mode === "contain") {
    const w = Math.min(width, height * ratio);
    return { width: w, height: w / ratio, repeatX: 1, repeatY: 1, offsetX: 0, offsetY: 0 };
  }
  const repeatX = Math.min(1, aperture / ratio), repeatY = Math.min(1, ratio / aperture);
  return { width, height, repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: (1 - repeatY) / 2 };
}
