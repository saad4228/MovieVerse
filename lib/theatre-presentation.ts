import type { Blueprint } from "./catalog";
import { auditoriumEnvelope, screenFrame } from "./auditorium";

/** Render-only adjustment. Seat coordinates, IDs, categories and prices stay untouched. */
export function bookingTheatrePresentation(blueprint: Blueprint): Blueprint {
  if (blueprint.modelUrl) return blueprint;
  const frame = screenFrame(blueprint);
  if (Math.abs(frame.rotationY) > .001) return blueprint;
  const room = auditoriumEnvelope(blueprint);
  const bottom = frame.y - frame.height / 2;
  const horizontal = 2 * (blueprint.width / 2 - Math.abs(frame.x) - .65);
  const vertical = room.height - .85 - bottom;
  const scale = Math.max(1, Math.min(1.025, horizontal / frame.width, vertical / frame.height));
  if (scale <= 1) return blueprint;
  return {...blueprint, screen: {
    ...blueprint.screen,
    width: frame.width * scale,
    height: frame.height * scale,
    position: [frame.x, bottom + frame.height * scale / 2, frame.z],
    rotationY: frame.rotationY,
  }};
}
