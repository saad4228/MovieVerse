import type { Blueprint } from "./catalog";
export interface CameraMovementConfig {
  rotationSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  dampingFactor: number;
  transitionDuration: number;
  minDistance: number;
  maxDistance: number;
}
/** Damping is specified at 60 Hz and normalized to elapsed time by the controller. */
export function cameraMovementConfig(b: Blueprint, overrides: Partial<CameraMovementConfig> = {}): CameraMovementConfig {
  return { rotationSpeed: 1.05, panSpeed: 1.15, zoomSpeed: 1.35, dampingFactor: 0.24,
    transitionDuration: 1.1, minDistance: 0.65, maxDistance: Math.hypot(b.width, b.depth), ...overrides };
}
