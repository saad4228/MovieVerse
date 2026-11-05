import { describe, it, expect, vi, afterEach } from "vitest";
import { movies } from "../lib/catalog";
import { enrichMovieMedia } from "../lib/movie-media";
import { cinemaListings } from "../lib/cinema-listings";
import { embeddedTrailer, youtubeEmbedUrl, youtubeVideoId } from "../lib/video/sources";

describe("movie media configuration", () => {
  it("resolves enabled movie-specific embeds and respects a disabled source", () => {
    const movie = movies.find(m => m.id === "jailer-2")!;
    expect(embeddedTrailer(movie)?.videoId).toBe("FW_PPcr1sPE");
    expect(embeddedTrailer({ ...movie, trailers: movie.trailers!.map(source => ({ ...source, playbackAllowed: false })) })).toBeUndefined();
    expect(youtubeVideoId("https://youtu.be/FW_PPcr1sPE")).toBe("FW_PPcr1sPE");
    expect(youtubeVideoId("https://example.com/watch?v=FW_PPcr1sPE")).toBeUndefined();
    expect(embeddedTrailer(movies.find(m => m.id === "sintel")!)).toBeUndefined();
  });
  it("builds clean IFrame URLs for multiple movie trailers", () => {
    for (const [movieId, expectedVideoId] of [
      ["jailer-2", "FW_PPcr1sPE"],
      ["leo", "Po3jStA673E"],
      ["varanasi", "jDGETw3YAHc"],
    ]) {
      const movie = movies.find((candidate) => candidate.id === movieId)!;
      const trailer = embeddedTrailer(movie);
      expect(trailer?.videoId).toBe(expectedVideoId);
      const url = new URL(youtubeEmbedUrl(trailer!.videoId, "https://movieverse.example"));
      expect(url.pathname).toBe(`/embed/${expectedVideoId}`);
      expect(url.searchParams.get("controls")).toBe("0");
      expect(url.searchParams.get("cc_load_policy")).toBe("0");
      expect(url.searchParams.get("disablekb")).toBe("1");
      expect(url.searchParams.get("playsinline")).toBe("1");
      expect(url.searchParams.get("enablejsapi")).toBe("1");
      expect(url.searchParams.get("origin")).toBe("https://movieverse.example");
    }
  });
  it("assigns distinct film trailers and matching full-resolution artwork", () => {
    const films = movies.filter((m) => !!m.youtubeId);
    expect(new Set(films.map((m) => m.youtubeId)).size).toBe(films.length);
    expect(new Set(films.map((m) => m.backdrop)).size).toBe(films.length);
    films.forEach((movie) => {
      expect(movie.poster).toMatch(/^\/assets\//);
      expect(movie.posterSmall).toMatch(/^\/assets\//);
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
  it("requires production approval and rejects runtime mock mode",async()=>{
    const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
    for(const settings of [
      {SHOWTIMES_MODE:"mock",LIVE_SHOWTIMES_ENDPOINT:"https://example.com/listings"},
      {SHOWTIMES_MODE:"production",LIVE_SHOWTIMES_ENDPOINT:"https://example.com/listings"},
    ]){
      const result=await cinemaListings("chennai","jailer-2","2026-11-02",settings);
      expect(result.status).toBe("provider-unavailable");
      expect(result.venues).toEqual([]);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not substitute directory venues when the production feed fails",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("fixture outage")));
    const result=await cinemaListings("chennai","jailer-2","2026-11-02",{SHOWTIMES_MODE:"production",LIVE_SHOWTIMES_ENDPOINT:"https://example.com/listings",LIVE_SHOWTIMES_APPROVED:"true"});
    expect(result.status).toBe("provider-unavailable");
    expect(result.venues).toEqual([]);
  });
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
      vi.fn().mockResolvedValue(
        Response.json({
          mode: "production",
          providerId: "licensed-provider-fixture",
          checked: new Date().toISOString(),
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
          LIVE_SHOWTIMES_APPROVED: "true",
        })
      ).status,
    ).toBe("provider-unavailable");
  });
  it("accepts validated film-specific provider showtimes", async () => {
    const data = {
      mode: "production",
      providerId: "licensed-provider-fixture",
      checked: new Date().toISOString(),
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
              id: "provider-show-1",
              auditoriumId: "provider-screen-1",
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
      LIVE_SHOWTIMES_APPROVED: "true",
    });
    expect(result.status).toBe("live");
    expect(result.venues[0].shows).toEqual(data.venues[0].shows);
  });
});
