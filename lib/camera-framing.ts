/** Vertical perspective field of view needed to contain camera-space corners.
 * A small aperture margin keeps the screen frame inside responsive viewports. */
export function screenFramingFov(corners: {x: number; y: number; z: number}[], aspect: number, minimum = 64, margin = .96) {
  let tangent = Math.tan(minimum * Math.PI / 360);
  for (const corner of corners) {
    if (corner.z >= 0 || aspect <= 0) continue;
    tangent = Math.max(tangent, Math.max(Math.abs(corner.y), Math.abs(corner.x) / aspect) / (-corner.z * margin));
  }
  return Math.min(120, 2 * Math.atan(tangent) * 180 / Math.PI);
}
