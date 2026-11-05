import type { Blueprint } from "./catalog";

/** Metres of forward arc at the side walls. Explicit venue overrides win. */
export const rowCurvature = (b: Blueprint) => b.curvature ?? (!b.modelUrl && b.id === "grand" ? 1.15 : 0);
export const rowArc = (b: Blueprint, x: number) => rowCurvature(b) * (x / (b.width / 2)) ** 2;
