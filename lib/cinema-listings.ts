import directory from "../data/cinema-directory.json" with { type: "json" };
import { z } from "zod";
import { cinemaDirectoryProvider } from "./cinema-directory";

const listingSchema = z.object({
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
          time: z.string(),
          format: z.string(),
          language: z.string(),
          auditoriumId: z.string().optional(),
          price: z.number().nonnegative().optional(),
          availability: z.enum(["available","limited","sold-out","unknown"]).optional(),
          bookingUrl: z
            .string()
            .url()
            .refine((url) => url.startsWith("https://")),
        }),
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
  if (!settings.LIVE_SHOWTIMES_ENDPOINT) return fallback;
  try {
    const endpoint = new URL(settings.LIVE_SHOWTIMES_ENDPOINT);
    if (endpoint.protocol !== "https:") return fallback;
    endpoint.searchParams.set("city", cityId);
    endpoint.searchParams.set("movie", movieId);
    endpoint.searchParams.set("date", date);
    const response = await fetch(endpoint, {
      headers: settings.LIVE_SHOWTIMES_TOKEN
        ? { Authorization: `Bearer ${settings.LIVE_SHOWTIMES_TOKEN}` }
        : {},
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Listings provider unavailable");
    const data = listingSchema.parse(await response.json());
    if (
      data.cityId !== cityId ||
      data.movieId !== movieId ||
      data.date !== date
    )
      throw new Error("Listings context mismatch");
    return {
      ...data,
      status: "live",
      source: endpoint.origin,
      checked: new Date().toISOString(),
      complete: data.complete === true,
    };
  } catch {
    return { ...fallback, status: "provider-unavailable" };
  }
}
