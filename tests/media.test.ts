import { describe, it, expect, vi, afterEach } from "vitest";
import { screenMatrix } from "../lib/screen-projection";
import { movies } from "../lib/catalog";
import { enrichMovieMedia } from "../lib/movie-media";
import { cinemaListings } from "../lib/cinema-listings";

describe("projected cinema playback", () => {
  it("maps all four source corners to a perspective screen", () => {
    const corners = [
      { x: 20, y: 40 },
      { x: 800, y: 130 },
      { x: 760, y: 600 },
      { x: 65, y: 530 },
    ] as const;
    const m = screenMatrix([...corners]);
    expect(m).not.toBeNull();
    [
      [0, 0],
      [1280, 0],
      [1280, 720],
      [0, 720],
    ].forEach(([x, y], i) => {
      const w = m![3] * x + m![7] * y + m![15];
      expect((m![0] * x + m![4] * y + m![12]) / w).toBeCloseTo(corners[i].x, 5);
      expect((m![1] * x + m![5] * y + m![13]) / w).toBeCloseTo(corners[i].y, 5);
    });
  });
  it("hides a collapsed or invalid projection", () => {
    expect(
      screenMatrix([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ]),
    ).toBeNull();
    expect(
      screenMatrix([
        { x: NaN, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ]),
    ).toBeNull();
  });
});
describe("movie media configuration", () => {
  it("assigns distinct film trailers and matching full-resolution artwork", () => {
    const films = movies.filter((m) => m.id !== "sintel");
    expect(new Set(films.map((m) => m.youtubeId)).size).toBe(films.length);
    expect(new Set(films.map((m) => m.backdrop)).size).toBe(films.length);
    films.forEach((movie) => {
      expect(movie.poster).toContain("/assets/posters/");
      expect(movie.posterSmall).toContain("-600.webp");
      expect(movie.youtubeId).toMatch(/^[\w-]{11}$/);
    });
  });
  it("preserves operator artwork and allows disabling YouTube", () => {
    const film = {
      ...movies[0],
      poster: "https://example.com/poster.webp",
      backdrop: "https://example.com/backdrop.webp",
      youtubeId: null,
    };
    expect(enrichMovieMedia(film)).toMatchObject(film);
  });
});
describe("real cinema availability boundaries", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("never manufactures screenings from a city directory", async () => {
    const result = await cinemaListings(
      "chennai",
      "jailer-2",
      "2026-11-02",
      {},
    );
    expect(result.complete).toBe(false);
    expect(result.venues.length).toBeGreaterThan(0);
    expect(result.venues.every((v) => v.shows.length === 0)).toBe(true);
  });
  it("rejects stale provider results for another city or date", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            cityId: "mumbai",
            movieId: "jailer-2",
            date: "2026-11-02",
            venues: [],
          }),
        ),
    );
    expect(
      (
        await cinemaListings("chennai", "jailer-2", "2026-11-02", {
          LIVE_SHOWTIMES_ENDPOINT: "https://example.com/listings",
        })
      ).status,
    ).toBe("provider-unavailable");
  });
  it("accepts validated film-specific provider showtimes", async () => {
    const data = {
      cityId: "chennai",
      movieId: "jailer-2",
      date: "2026-11-02",
      venues: [
        {
          id: "real-1",
          name: "Connected Cinema",
          address: "Chennai",
          shows: [
            {
              time: "18:30",
              format: "IMAX",
              language: "Tamil",
              bookingUrl: "https://example.com/book",
            },
          ],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
    const result = await cinemaListings("chennai", "jailer-2", "2026-11-02", {
      LIVE_SHOWTIMES_ENDPOINT: "https://example.com/listings",
    });
    expect(result.status).toBe("live");
    expect(result.venues[0].shows).toEqual(data.venues[0].shows);
  });
});
