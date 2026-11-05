import { describe, expect, it } from "vitest";
import { projectionFit } from "../lib/video/controller";
describe("projection aperture fitting", () => {
  for (const aspect of [16 / 9, 2.39, 1.85, 4 / 3]) {
    it(`preserves ${aspect} footage in contain and cover modes`, () => {
      const contained = projectionFit(24, 13.5, aspect, "contain");
      expect(contained.width / contained.height).toBeCloseTo(aspect);
      expect(contained.width).toBeLessThanOrEqual(24);
      expect(contained.height).toBeLessThanOrEqual(13.5);
      const covered = projectionFit(24, 13.5, aspect, "cover");
      expect(covered.width).toBe(24);
      expect(covered.height).toBe(13.5);
      expect(aspect * covered.repeatX / covered.repeatY).toBeCloseTo(24 / 13.5);
      expect(covered.offsetX * 2 + covered.repeatX).toBeCloseTo(1);
      expect(covered.offsetY * 2 + covered.repeatY).toBeCloseTo(1);
    });
  }
});
