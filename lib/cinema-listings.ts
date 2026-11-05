import directory from "../data/cinema-directory.json" with { type: "json" };
import { z } from "zod";
import { cinemaDirectoryProvider } from "./cinema-directory";

const listingSchema = z.object({
  mode: z.literal("production"),
  providerId: z.string().min(1).max(100),
  checked: z.string().datetime(),
  cityId: z.string(),
  movieId: z.string(),
  date: z.string(),
  complete: z.boolean().optional(),
  venues: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      shows: z.array(
        z.object({
          id: z.string().min(1).max(200),
          time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          format: z.string(),
          language: z.string(),
          auditoriumId: z.string().min(1),
          price: z.number().nonnegative().optional(),
          currency: z.literal("INR").optional(),
          availability: z.enum(["available","limited","sold-out","unknown"]).optional(),
          bookingUrl: z
            .string()
            .url()
            .refine((url) => url.startsWith("https://")),
        }).refine(show=>show.price === undefined || show.currency === "INR", "Prices require their currency"),
      ),
    }),
  ),
});
export type CinemaDirectoryResult = {
  cityId: string;
  movieId: string;
  date: string;
  status: "directory" | "live" | "provider-unavailable";
  source: string;
  checked: string;
  complete: boolean;
  providerId?: string;
  error?: string;
  venues: z.infer<typeof listingSchema>["venues"];
};
/** A directory is never treated as evidence that a film is screening. */
export async function cinemaListings(
  cityId: string,
  movieId: string,
  date: string,
  settings: Record<string, string | undefined>,
): Promise<CinemaDirectoryResult> {
  const entry = (
    directory as Record<
      string,
      { names: string[]; source: string; checked: string }
    >
  )[cityId];
  const fallback: CinemaDirectoryResult = {
    cityId,
    movieId,
    date,
    status: "directory",
    source:
      entry?.source || `https://in.bookmyshow.com/explore/movies-${cityId}`,
    checked: entry?.checked || "",
    complete: false,
    venues: cinemaDirectoryProvider.list(cityId).map((venue) => ({
      id: venue.id,
      name: venue.name,
      address: venue.address,
      shows: [],
    })),
  };
  // The production path cannot select the local demo showtime generator.
  const mode = settings.SHOWTIMES_MODE || (settings.LIVE_SHOWTIMES_ENDPOINT ? "production" : "directory");
  if (mode === "directory") return fallback;
  const unavailable = (error: string): CinemaDirectoryResult => ({ ...fallback, status: "provider-unavailable", venues: [], checked: "", error });
  if (mode !== "production") return unavailable("Unsupported cinema provider mode. Demo screenings are available separately.");
  if (!settings.LIVE_SHOWTIMES_ENDPOINT || settings.LIVE_SHOWTIMES_APPROVED !== "true") return unavailable("Licensed cinema inventory is not connected or approved.");
  try {
    const endpoint = new URL(settings.LIVE_SHOWTIMES_ENDPOINT);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Invalid provider configuration");
    endpoint.searchParams.set("city", cityId);
    endpoint.searchParams.set("movie", movieId);
    endpoint.searchParams.set("date", date);
    const response = await fetch(endpoint, {
      headers: settings.LIVE_SHOWTIMES_TOKEN
        ? { Authorization: `Bearer ${settings.LIVE_SHOWTIMES_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error("Listings provider unavailable");
    const data = listingSchema.parse(await response.json());
    if (
      data.cityId !== cityId ||
      data.movieId !== movieId ||
      data.date !== date ||
      Date.now() - Date.parse(data.checked) > 2 * 3600_000 ||
      Date.parse(data.checked) > Date.now() + 60_000 ||
      new Set(data.venues.map(v=>v.id)).size !== data.venues.length ||
      data.venues.some(v=>new Set(v.shows.map(s=>s.id)).size !== v.shows.length)
    )
      throw new Error("Listings context mismatch");
    return {
      ...data,
      status: "live",
      source: endpoint.origin,
      complete: data.complete === true,
    };
  } catch {
    return unavailable("Cinema inventory is temporarily unavailable. No live screenings could be verified.");
  }
}
