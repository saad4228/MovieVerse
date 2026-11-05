import { describe, expect, it } from "vitest";
import { blueprints, makeSeats, movies } from "../lib/catalog";
import {
  cameraObstructed,
  auditoriumEnvelope,
  cameraView,
  clampRoom,
  safeCameraPath,
  screenFrame,
  seatEye,
  viewpoints,
  type Point,
} from "../lib/auditorium";
import {
  youtubeEmbedUrl,
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
      expect(high[1]).toBeLessThan(auditoriumEnvelope(b).height);
      expect(high[2]).toBeLessThan(b.depth / 2);
      const seat = makeSeats(b)[5];
      expect(
        cameraObstructed(b, [seat], [seat.x, seat.y + 1.1, seat.z + 0.3]),
      ).toBe(true);
    });
    it(`${b.id}: large screen, frame and valance fit while first-row sightlines remain usable`, () => {
      const frame = screenFrame(b), room = auditoriumEnvelope(b);
      const seats = makeSeats(b);
      expect(frame.width / (b.width - 1.6)).toBeGreaterThanOrEqual(.75);
      expect(frame.width / (b.width - 1.6)).toBeLessThanOrEqual(.85 + Number.EPSILON);
      expect(frame.width / frame.height).toBeCloseTo(16 / 9, 8);
      expect(frame.width / 2 + .325).toBeLessThan(b.width / 2 - .4);
      expect(frame.y - frame.height / 2 - .325).toBeGreaterThan(.9);
      expect(frame.y + frame.height / 2 + .725).toBeLessThan(room.height - .3);
      expect(frame.z - .335).toBeGreaterThan(room.front + .15);
      const firstRow = seats.filter(s => s.row === seats[0].row);
      for (const seat of firstRow) {
        const eye = seatEye(seat);
        const angle = Math.atan2(frame.y - eye[1], Math.hypot(frame.x - eye[0], frame.z - eye[2])) * 180 / Math.PI;
        expect(angle).toBeLessThanOrEqual(35.01);
      }
      const view = cameraView(b, "From stage", seats, null, 0);
      expect(view.position[2]).toBeGreaterThan(frame.z);
      expect(view.target).toEqual([frame.x, frame.y, frame.z]);
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

it("embedded trailers disable standard controls and fullscreen on every URL", () => {
  for (const id of ["first", "second"]) {
    const url = new URL(youtubeEmbedUrl(id, "http://localhost:5173"));
    for (const [key, value] of Object.entries({controls:"0",fs:"0",disablekb:"1",enablejsapi:"1",autoplay:"1",playsinline:"1",rel:"0"})) expect(url.searchParams.get(key)).toBe(value);
  }
});
for (const b of blueprints) it(`${b.id}: camera clearance blocks under-seat volumes and uses walls, not the screen plane`, () => {
 const seats=makeSeats(b), room=auditoriumEnvelope(b);
 for(const seat of seats) {
   expect(cameraObstructed(b,seats,[seat.x,seat.y+.3,seat.z])).toBe(true);
   expect(cameraObstructed(b,seats,[seat.x,seat.y+1.3,seat.z+.4])).toBe(true);
   expect(cameraObstructed(b,seats,seatEye(seat),seat.id)).toBe(false);
 }
 const nearScreen:Point=[0,5,screenFrame(b).z+.8];
 expect(clampRoom(b,nearScreen)).toEqual(nearScreen);
 expect(clampRoom(b,[0,5,-999])[2]).toBeCloseTo(room.front+.65);
});
