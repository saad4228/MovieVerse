import { z } from "zod";
import { cities, movies, venues, blueprints, snacks } from "./catalog";
const url = z
  .string()
  .max(2048)
  .refine(
    (v) => v.startsWith("/assets/") || /^https:\/\//.test(v),
    "Use an /assets/ path or an HTTPS URL.",
  );
const id = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/);
export const citySchema = z.object({
  id,
  name: z.string().min(2).max(80),
  subtitle: z.string().max(150),
  symbol: z.string().max(20),
});
export const movieSchema = z.object({
  id,
  title: z.string().min(1).max(100),
  aliases: z.array(z.string().max(120)).max(20).optional(),
  tagline: z.string().max(200),
  description: z.string().max(3000),
  genre: z.array(z.string().max(30)).min(1).max(8),
  languages: z.array(z.string().max(30)).min(1).max(15),
  duration: z.number().int().min(0).max(300),
  rating: z.number().min(0).max(10),
  votes: z.string().max(20),
  certificate: z.string().max(20),
  poster: url,
  posterSmall: url.optional(),
  backdrop: url,
  release: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
  status: z.enum(["showing", "upcoming"]),
  formats: z.array(z.string().max(30)).max(8),
  cast: z.array(z.string().max(100)).max(20),
  trailer: url.nullable(),
  trailers: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        provider: z.enum(["direct-mp4", "hls", "youtube", "other"]),
        url,
        type: z.enum(["official-trailer", "teaser", "preview", "sample"]),
        playbackAllowed: z.boolean(),
        isPrimary: z.boolean().optional(),
        height: z.number().int().min(144).max(8640).optional(),
        language: z.string().max(50).optional(),
        posterImage: url.optional(),
        attribution: z.string().max(300).optional(),
        licenseUrl: url.optional(),
        fit: z.enum(["contain", "cover"]).optional(),
      }),
    )
    .max(20)
    .optional(),
  youtubeId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{11}$/)
    .nullable()
    .optional(),
  trailerLabel: z.string().max(100).optional(),
  mediaCredit: z.string().max(100).optional(),
  mediaSource: url.optional(),
  backdropSmall: url.optional(),
  backdropWidth: z.number().positive().optional(),
  backdropHeight: z.number().positive().optional(),
  backdropPosition: z.string().max(50).optional(),
  alternativeBackdrops: z.array(url).max(20).optional(),
  metadata: z.object({
    tmdbId: z.number().int().positive().optional(),
    overview: z.string().max(5000), story: z.string().max(8000).optional(),
    cast: z.array(z.object({id:z.number().int().positive().optional(),name:z.string().max(100),character:z.string().max(200).optional(),profilePath:z.string().max(2048).nullable().optional()})).max(100),
    crew: z.array(z.object({id:z.number().int().positive().optional(),name:z.string().max(100),job:z.string().max(100).optional(),profilePath:z.string().max(2048).nullable().optional()})).max(100),
    production:z.array(z.string().max(200)).max(30),
    releaseDates:z.array(z.object({region:z.string().max(20),date:z.string().nullable(),status:z.enum(["announced","released","unconfirmed"]),source:z.string().max(2048)})).max(50),
    sources:z.array(z.string().max(2048)).max(30),checked:z.string().max(30),backdropPosition:z.string().max(50).optional(),
  }).optional(),
  accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
});
export const venueSchema = z.object({
  id,
  cityId: id,
  name: z.string().min(2).max(120),
  locality: z.string().max(100),
  address: z.string().max(300),
  distance: z.number().min(0).max(100),
  amenities: z
    .array(z.enum(["Parking", "Wheelchair access", "Recliners", "Food court"]))
    .max(8),
  formats: z.array(z.string().max(30)).min(1).max(8),
  blueprints: z
    .array(id)
    .min(1)
    .max(3),
  movieIds: z.array(id).max(100),
  price: z.number().int().min(160).max(2000),
  image: url,
  times: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
    .min(1)
    .max(8)
    .optional(),
  screenings: z.array(z.object({key:id,movieId:id,auditoriumId:id,blueprintId:id,time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),language:z.string().max(30),format:z.string().max(30),price:z.number().int().min(160).max(2000),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()})).max(100).optional(),
});
export const snackSchema = z.object({
  id,
  name: z.string().min(2).max(100),
  description: z.string().max(300),
  category: z.enum(["Popcorn", "Nachos", "Beverages", "Combos", "Desserts"]),
  price: z.number().int().min(1).max(5000),
  image: url,
});
export type Catalog = {
  catalogRevision?: number;
  cities: typeof cities;
  movies: typeof movies;
  venues: typeof venues;
  snacks: typeof snacks;
  blueprints: typeof blueprints;
};
export const catalogSchema = z.object({
  catalogRevision: z.number().int().min(1).default(4),
  cities: z.array(citySchema).min(1).max(100),
  movies: z.array(movieSchema).min(1).max(100),
  venues: z.array(venueSchema).min(1).max(150),
  snacks: z.array(snackSchema).max(100),
});
export function assertCatalog(data: z.infer<typeof catalogSchema>) {
  for (const key of ["cities", "movies", "venues", "snacks"] as const) {
    if (new Set(data[key].map((x) => x.id)).size !== data[key].length)
      throw new Error(`Duplicate ${key} IDs.`);
  }
  for (const v of data.venues) {
    if(v.screenings) {
      if(new Set(v.screenings.map(s=>s.key)).size!==v.screenings.length) throw new Error("Screening keys must be unique within a venue.");
      for(const show of v.screenings) {
        const movie=data.movies.find(m=>m.id===show.movieId);
        if(!movie || !v.movieIds.includes(show.movieId) || !v.blueprints.includes(show.blueprintId) || !movie.languages.includes(show.language) || !v.formats.includes(show.format)) throw new Error("A screening must reference its venue, movie language, auditorium blueprint and supported format.");
        const other=v.screenings.filter(s=>s.key!==show.key && s.auditoriumId===show.auditoriumId);
        const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
        if(other.some(s=>s.blueprintId!==show.blueprintId || ((!s.date || !show.date || s.date===show.date) && minutes(s.time)<minutes(show.time)+(movie.duration||180)+20 && minutes(show.time)<minutes(s.time)+(data.movies.find(m=>m.id===s.movieId)?.duration||180)+20))) throw new Error("An auditorium cannot change blueprint or host overlapping screenings.");
      }
    }
    if (v.times && new Set(v.times).size !== v.times.length)
      throw new Error(`${v.name} has duplicate screening times.`);
    if (!data.cities.some((c) => c.id === v.cityId))
      throw new Error(`${v.name} references an unknown city.`);
    if (v.movieIds.some((id) => !data.movies.some((m) => m.id === id)))
      throw new Error(`${v.name} references an unknown movie.`);
  }
}
export function applyClientCatalog(data: Catalog) {
  cities.splice(0, cities.length, ...data.cities);
  movies.splice(0, movies.length, ...data.movies);
  venues.splice(0, venues.length, ...data.venues);
  snacks.splice(0, snacks.length, ...data.snacks);
  blueprints.splice(0, blueprints.length, ...data.blueprints);
}
