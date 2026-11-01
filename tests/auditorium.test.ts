import { describe, expect, it } from "vitest";
import { blueprints, makeSeats, movies } from "../lib/catalog";
import {
  cameraObstructed,
  cameraView,
  clampRoom,
  safeCameraPath,
  screenFrame,
  viewpoints,
  type Point,
} from "../lib/auditorium";
import {
  directSources,
  officialTrailerLink,
  fitScreen,
  markFailed,
  hasFailed,
  safeMediaUrl,
} from "../lib/video/sources";

describe("physical auditorium navigation", () => {
  for (const b of blueprints) {
    it(`${b.id}: viewpoints and transition paths stay clear of seats and rails`, () => {
      const seats = makeSeats(b);
      const start = cameraView(b, "Overview", seats, null, 0);
      const destinations = [
        ...viewpoints(b),
        ...(["From stage", "Bird’s eye", "My seat"] as const).map((p) =>
          cameraView(b, p, seats, seats[Math.floor(seats.length / 2)].id, 0),
        ),
      ];
      for (const view of destinations) {
        expect(clampRoom(b, view.position)).toEqual(view.position);
        let from = start.position;
        for (const to of safeCameraPath(b, start.position, view.position)) {
          for (let step = 1; step <= 25; step++) {
            const point = from.map(
              (n, i) => n + ((to[i] - n) * step) / 25,
            ) as Point;
            expect(cameraObstructed(b, seats, point)).toBe(false);
          }
          from = to;
        }
      }
    });
    it(`${b.id}: clamps floor, screen, side walls, ceiling and rear wall`, () => {
      const p = clampRoom(b, [-999, -999, -999]);
      expect(p[0]).toBeGreaterThan(-b.width / 2);
      expect(p[1]).toBeGreaterThan(0);
      expect(p[2]).toBeGreaterThan(screenFrame(b).z);
      const high = clampRoom(b, [999, 999, 999]);
      expect(high[0]).toBeLessThan(b.width / 2);
      expect(high[1]).toBeLessThan(b.height);
      expect(high[2]).toBeLessThan(b.depth / 2);
      const seat = makeSeats(b)[5];
      expect(
        cameraObstructed(b, [seat], [seat.x, seat.y + 1.1, seat.z + 0.3]),
      ).toBe(true);
    });
  }
  it("uses a smaller route in compact rooms and respects a custom screen", () => {
    expect(viewpoints(blueprints[2]).length).toBeLessThan(
      viewpoints(blueprints[0]).length,
    );
    const b = {
      ...blueprints[0],
      screen: {
        width: 20,
        height: 9,
        position: [1, 6, -15] as Point,
        rotationY: 0.1,
      },
    };
    expect(screenFrame(b)).toEqual({
      width: 20,
      height: 9,
      x: 1,
      y: 6,
      z: -15,
      rotationY: 0.1,
    });
  });
});
describe("direct media selection", () => {
  it("never treats a YouTube watch page as texture media", () => {
    const movie = movies.find((m) => m.id === "toxic")!;
    expect(directSources(movie)).toEqual([]);
    expect(officialTrailerLink(movie)).toContain("EfluEyQ5QIA");
    expect(
      directSources(movies.find((m) => m.id === "sintel")!).map(
        (s) => s.height,
      ),
    ).toEqual([1080, 720]);
  });
  it("respects explicit empty overrides and playback permission", () => {
    const m = movies[0];
    expect(
      directSources({ ...m, trailer: "/assets/old.mp4", trailers: [] }),
    ).toEqual([]);
    expect(
      directSources({
        ...m,
        trailers: [
          {
            id: "denied",
            provider: "direct-mp4",
            type: "preview",
            url: "https://example.com/a.mp4",
            playbackAllowed: false,
          },
        ],
      }),
    ).toEqual([]);
    expect(safeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(safeMediaUrl("/assets/../secret")).toBe(false);
  });
  it("expires failures and fits video without stretching", () => {
    markFailed("https://example.com/broken.mp4", 0);
    expect(hasFailed("https://example.com/broken.mp4", 100)).toBe(true);
    expect(hasFailed("https://example.com/broken.mp4", 300001)).toBe(false);
    const fit = fitScreen(24, 13.5, 2.4);
    expect(fit).toEqual({ width: 24, height: 10 });
    expect(fitScreen(24, 13.5, 1).width).toBe(13.5);
  });
});
