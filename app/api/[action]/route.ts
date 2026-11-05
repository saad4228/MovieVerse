import { checkoutOffer } from "@/lib/checkout-offers";
import { RequestError, readRequestJson } from "@/lib/request-json";
import { catalogueApi } from "@/lib/catalogue-api";
import {bookableFeatured} from "@/lib/bookable-featured";
import {readWatchlist,changeWatchlist,watchlistInput,WatchlistMovieError} from "@/lib/watchlist";
import { readPhotoRequest, validateProfilePhoto } from "@/lib/profile-photo";
import { blueprintSchema } from "@/lib/blueprint-config";
import { env } from "cloudflare:workers";
import { z } from "zod";
import {
  blueprints,
  cities,
  movies,
  venues,
  snacks,
  getShow,
  makeSeats,
  type Blueprint,
} from "@/lib/catalog";
import {
  assertCatalog,
  catalogSchema,
  type Catalog,
} from "@/lib/catalog-config";
import { calculatePrice, screeningStarted, selectionError, seededUnavailable } from "@/lib/booking";
import { enrichMovieMedia } from "@/lib/movie-media";
import { cinemaListings } from "@/lib/cinema-listings";
import { metadataProvider } from "@/lib/metadata-provider";
import { enrichMovieInformation } from "@/lib/movie-information";
import { upgradeCatalog } from "@/lib/catalog-upgrade";
import { tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
const db = () => {
  if (!env.DB)
    throw new Error(
      "Database is unavailable. Apply the local migrations first.",
    );
  return env.DB;
};
const json = (data: unknown, status = 200, cookie?: string) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const digest = async (s: string) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
async function password(value: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
type Session = { id: string; user_id: string | null; cookie?: string };
async function session(req: Request): Promise<Session> {
  const raw = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)mv_session=([a-f0-9-]{36})/)?.[1];
  if (raw) {
    const row = await db()
      .prepare("SELECT * FROM sessions WHERE id=? AND expires>?")
      .bind(await digest(raw), Date.now())
      .first<Session>();
    if (row) return row;
  }
  const token = crypto.randomUUID();
  const id = await digest(token);
  await db()
    .prepare("INSERT INTO sessions (id,user_id,expires) VALUES (?,NULL,?)")
    .bind(id, Date.now() + 30 * 86400000)
    .run();
  return {
    id,
    user_id: null,
    cookie: `mv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
async function blueprint(id: string): Promise<Blueprint> {
  const row = await db()
    .prepare("SELECT config FROM blueprints WHERE id=?")
    .bind(id)
    .first<{ config: string }>();
  return row ? JSON.parse(row.config) : blueprints.find((b) => b.id === id)!;
}
async function configuredCatalog(): Promise<Catalog> {
  const row = await db()
    .prepare("SELECT document FROM catalog_config WHERE id='active'")
    .first<{ document: string }>();
  const stored = row
    ? JSON.parse(row.document)
    : { cities, movies, venues, snacks };
  const catalog = upgradeCatalog(stored, movies, venues);
  return {
    ...catalog,
    movies: catalog.movies.map((m: typeof movies[number]) => enrichMovieInformation(enrichMovieMedia(m))),
    blueprints,
  };
}
async function ensureInventory(showId: string, catalog: Catalog) {
  const show = getShow(showId, catalog.venues, catalog.movies);
  if (!show)
    throw new RequestError(
      "This screening is no longer available. Choose another showtime.",
    );
  const saved = await db()
    .prepare("SELECT config FROM show_blueprints WHERE show_id=?")
    .bind(showId)
    .first<{ config: string }>();
  if (!saved) {
    const current = await blueprint(show.blueprintId);
    await db()
      .prepare(
        "INSERT OR IGNORE INTO show_blueprints (show_id,config) VALUES (?,?)",
      )
      .bind(showId, JSON.stringify(current))
      .run();
  }
  const snapshot = await db()
    .prepare("SELECT config FROM show_blueprints WHERE show_id=?")
    .bind(showId)
    .first<{ config: string }>();
  const b: Blueprint = JSON.parse(snapshot!.config);
  const seats = makeSeats(b);
  const existing = await db()
    .prepare("SELECT count(*) AS n FROM inventory WHERE show_id=?")
    .bind(showId)
    .first<{ n: number }>();
  if (!existing?.n) {
    const statements = [];
    for (let i = 0; i < seats.length; i += 16) {
      const chunk = seats.slice(i, i + 16);
      statements.push(
        db()
          .prepare(
            `INSERT OR IGNORE INTO inventory (show_id,seat_id,status) VALUES ${chunk.map(() => "(?,?,?)").join(",")}`,
          )
          .bind(
            ...chunk.flatMap((s) => [
              showId,
              s.id,
              seededUnavailable(showId, s),
            ]),
          ),
      );
    }
    await db().batch(statements);
  }
  return { show, blueprint: b, seats };
}
async function getInventory(showId: string, s: Session, catalog: Catalog) {
  const config = await ensureInventory(showId, catalog);
  const rows = await db()
    .prepare("SELECT * FROM inventory WHERE show_id=?")
    .bind(showId)
    .all<{ seat_id: string; status: string; owner: string; expires: number }>();
  const now = Date.now();
  return {
    ...config,
    inventory: Object.fromEntries(
      rows.results.map((r) => [
        r.seat_id,
        {
          status:
            r.status === "held" && r.expires < now ? "available" : r.status,
          mine: r.owner === s.id,
          expires: r.expires,
        },
      ]),
    ),
  };
}
const holdSchema = z.object({
  showId: z.string().max(150),
  seats: z
    .array(z.string().regex(/^[A-Z]\d{1,2}$/))
    .min(1)
    .max(8),
});
const checkoutSchema = holdSchema.extend({
  cart: z.record(z.number().int().min(0).max(10)),
  promo: z.string().max(30).default(""),
  requestId: z.string().uuid(),
  outcome: z.enum(["success", "failure", "cancel"]).default("success"),
});
async function handler(req: Request) {
  let s: Session | undefined;
  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    if (req.method === "POST") {
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin)
        return json({ error: "Invalid request origin." }, 403);
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "JSON required." }, 415);
      if (
        Number(req.headers.get("content-length") || 0) >
        (action === "catalog" ? 250000 : action === "profile-photo" ? 200000 : 40000)
      )
        return json({ error: "Request too large." }, 413);
    }
    const discoveryResponse=await catalogueApi(req,action||"",env);
    if(discoveryResponse)return discoveryResponse;
    const catalog = await configuredCatalog();
    if(req.method==="GET"&&action==="bookable-featured"){
      const city=url.searchParams.get("city")??"";
      if(!catalog.cities.some(c=>c.id===city))return json({error:"Choose a valid city."},400);
      return json(await bookableFeatured(db(),catalog,city));
    }
    if (req.method === "GET" && action === "movie-information") {
      const movie = catalog.movies.find(m=>m.id===url.searchParams.get("id"));
      if (!movie) return json({error:"Unknown movie."},404);
      const settings = env as unknown as Record<string, string | undefined>;
      try {
        return Response.json({movieId:movie.id,source:tmdbConfigured(settings) && movie.metadata?.tmdbId ? "tmdb-enriched-catalogue" : "bundled-catalogue",metadata:await metadataProvider(settings).get(movie)}, {headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=600"}});
      } catch { return json({error:"Movie metadata provider is temporarily unavailable.",source:"tmdb",status:"unavailable"},503); }
    }
    if (req.method === "GET" && action === "show-availability") {
      const ids = [...new Set((url.searchParams.get("shows") || "").split(",").filter(Boolean))];
      if (!ids.length || ids.length > 40 || ids.some(id=>!getShow(id,catalog.venues,catalog.movies))) return json({error:"Choose up to 40 valid screenings."},400);
      const rows = await db().prepare(`SELECT show_id, count(*) AS total, sum(CASE WHEN status='available' OR (status='held' AND expires<?) THEN 1 ELSE 0 END) AS available FROM inventory WHERE show_id IN (${ids.map(()=>"?").join(",")}) GROUP BY show_id`).bind(Date.now(),...ids).all<{show_id:string;total:number;available:number}>();
      return json({summaries:Object.fromEntries(ids.map(id=>{
        const row=rows.results.find(r=>r.show_id===id);
        return [id,{available:row?.available ?? null,total:row?.total ?? null,status:!row?"unknown":row.available===0?"sold-out":row.available/row.total<.2?"limited":"available",checked:new Date().toISOString()}];
      }))});
    }
    if (req.method === "GET" && action === "cinema-directory") {
      const url = new URL(req.url);
      const city = url.searchParams.get("city") || "",
        movie = url.searchParams.get("movie") || "",
        date = url.searchParams.get("date") || "";
      if (
        !catalog.cities.some((c) => c.id === city) ||
        !catalog.movies.some((m) => m.id === movie) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
      )
        return json({ error: "Choose a valid city, movie and date." }, 400);
      return json(
        await cinemaListings(
          city,
          movie,
          date,
          env as unknown as Record<string, string | undefined>,
        ),
      );
    }
    if (req.method === "GET" && action === "catalog") {
      const overrides = await db()
        .prepare("SELECT config FROM blueprints")
        .all<{ config: string }>();
      return json({
        ...catalog,
        blueprints: [...blueprints, ...overrides.results.map(x => JSON.parse(x.config) as Blueprint).filter(b => !blueprints.some(seed => seed.id === b.id))].map((b) => {
          const override = overrides.results
            .map((x) => JSON.parse(x.config))
            .find((x) => x.id === b.id);
          return override || b;
        }),
      });
    }
    s = await session(req);
    const reply = (data: unknown, status = 200) =>
      json(data, status, s!.cookie);
    if(action==="watchlist"){
      if(!s.user_id)return reply({error:"Sign in to use your watchlist."},401);
      if(req.method!=="POST"&&req.method!=="GET")return reply({error:"Method not allowed."},405);
      const input=req.method==="POST"?watchlistInput.parse(await readRequestJson(req)):null;
      try{
        if(input)return reply({userId:s.user_id,...await changeWatchlist(db(),s.user_id,catalog,input)});
        return reply({userId:s.user_id,entries:await readWatchlist(db(),s.user_id,catalog)});
      }catch(error){
        if(error instanceof WatchlistMovieError)return reply({error:error.message},400);
        return reply({error:"Your watchlist is temporarily unavailable. Please try again."},503);
      }
    }
    if (action === "profile" || action === "profile-photo") {
      if (!s.user_id) return reply({error:"Sign in to manage your profile photo."},401);
      if (req.method === "GET") {
        if (action === "profile") {
          const photo = await db().prepare("SELECT updated FROM profile_photos WHERE user_id=?").bind(s.user_id).first<{updated:number}>();
          return reply({avatar:photo ? `/api/profile-photo?v=${photo.updated}` : null});
        }
        const photo = await db().prepare("SELECT image FROM profile_photos WHERE user_id=?").bind(s.user_id).first<{image:string}>();
        if (!photo) return reply({error:"No profile photo."},404);
        const bytes=Uint8Array.from(atob(photo.image.split(",")[1]),c=>c.charCodeAt(0));
        return new Response(bytes,{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'",...(s.cookie?{"Set-Cookie":s.cookie}:{})}});
      }
      if (action !== "profile-photo") return reply({error:"Not found."},404);
      const body = await readPhotoRequest(req);
      const image = validateProfilePhoto(body.image);
      const updated = Date.now();
      if (image === null) await db().prepare("DELETE FROM profile_photos WHERE user_id=?").bind(s.user_id).run();
      else await db().prepare("INSERT INTO profile_photos (user_id,image,updated) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET image=excluded.image,updated=excluded.updated").bind(s.user_id,image,updated).run();
      return reply({avatar:image ? `/api/profile-photo?v=${updated}` : null});
    }
    if (req.method === "GET") {
      if (action === "session") {
        const user = s.user_id
          ? await db()
              .prepare("SELECT id,name,email FROM users WHERE id=?")
              .bind(s.user_id)
              .first()
          : null;
        return reply({ user });
      }
      if (action === "inventory")
        return reply(
          await getInventory(url.searchParams.get("show") || "", s, catalog),
        );
      if (action === "tickets") {
        const rows = await db()
          .prepare(
            "SELECT * FROM bookings WHERE owner=? OR (user_id IS NOT NULL AND user_id=?) ORDER BY created DESC",
          )
          .bind(s.id, s.user_id)
          .all();
        return reply({
          bookings: rows.results.map((r) => ({
            ...r,
            seats: JSON.parse(r.seats as string),
            cart: JSON.parse(r.cart as string),
            pricing: JSON.parse(r.pricing as string),
            snapshot: JSON.parse(r.snapshot as string),
          })),
        });
      }
      if (action === "ticket") {
        const token = url.searchParams.get("token");
        const ticket = await db()
          .prepare(
            "SELECT id,status,snapshot,seats FROM bookings WHERE token=?",
          )
          .bind(token)
          .first();
        return ticket
          ? reply({
              id: ticket.id,
              status: ticket.status,
              movie: JSON.parse(ticket.snapshot as string).movie.title,
              seats: JSON.parse(ticket.seats as string),
              demo: true,
            })
          : reply({ error: "Ticket not found." }, 404);
      }
      return reply({ error: "Not found." }, 404);
    }
    const body = await readRequestJson(req, action === "catalog" ? 250_000 : 40_000);
    if (action === "register" || action === "login") {
      const input = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(8).max(128),
          name: z.string().min(2).max(80).optional(),
        })
        .parse(body);
      const email = input.email.toLowerCase();
      const key = await digest(email);
      const now = Date.now();
      await db()
        .prepare(
          "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END",
        )
        .bind(key, now + 60000, now, now)
        .run();
      const rate = await db()
        .prepare("SELECT count FROM rate_limits WHERE key=?")
        .bind(key)
        .first<{ count: number }>();
      if (rate && rate.count > 8)
        return reply(
          { error: "Too many attempts. Try again in a minute." },
          429,
        );
      let user = await db()
        .prepare("SELECT * FROM users WHERE email=?")
        .bind(email)
        .first<{
          id: string;
          name: string;
          email: string;
          password: string;
          salt: string;
        }>();
      if (action === "register") {
        if (user)
          return reply(
            { error: "An account with this email already exists." },
            409,
          );
        if (!input.name)
          return reply({ error: "Please enter your name." }, 400);
        const salt = crypto.randomUUID();
        user = {
          id: crypto.randomUUID(),
          name: input.name,
          email,
          password: await password(input.password, salt),
          salt,
        };
        await db()
          .prepare(
            "INSERT INTO users (id,name,email,password,salt) VALUES (?,?,?,?,?)",
          )
          .bind(user.id, user.name, email, user.password, salt)
          .run();
      } else if (
        !user ||
        (await password(input.password, user.salt)) !== user.password
      )
        return reply({ error: "Incorrect email or password." }, 401);
      // Rotate sessions after authentication; migrate only this guest's records.
      const token = crypto.randomUUID();
      const id = await digest(token);
      await db().batch([
        db()
          .prepare("INSERT INTO sessions (id,user_id,expires) VALUES (?,?,?)")
          .bind(id, user!.id, Date.now() + 30 * 86400000),
        db()
          .prepare(
            "UPDATE bookings SET user_id=? WHERE owner=? AND user_id IS NULL",
          )
          .bind(user!.id, s.id),
        db()
          .prepare("UPDATE inventory SET owner=? WHERE owner=? AND status=?")
          .bind(id, s.id, "held"),
        db().prepare("DELETE FROM sessions WHERE id=?").bind(s.id),
      ]);
      s.cookie = `mv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${url.protocol === "https:" ? "; Secure" : ""}`;
      return reply({
        user: { id: user!.id, name: user!.name, email: user!.email },
      });
    }
    if (action === "logout") {
      await db().prepare("DELETE FROM sessions WHERE id=?").bind(s.id).run();
      return json(
        { ok: true },
        200,
        "mv_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      );
    }
    if (action === "release") {
      await db()
        .prepare(
          "UPDATE inventory SET status='available',owner=NULL,expires=NULL WHERE owner=? AND status='held'",
        )
        .bind(s.id)
        .run();
      return reply({ ok: true });
    }
    if (action === "hold") {
      const input = holdSchema.parse(body);
      const unique = [...new Set(input.seats)];
      const { seats, show } = await ensureInventory(input.showId, catalog);
      if (screeningStarted(show))
        return reply(
          {
            error:
              "This screening has already started. Please choose another showtime.",
          },
          409,
        );
      const invalidSelection = selectionError(input.seats, seats);
      if (invalidSelection) return reply({ error: invalidSelection }, 400);
      const marks = unique.map(() => "?").join(",");
      const now = Date.now();
      const expires = now + 8 * 60000;
      const hold = db()
        .prepare(
          `UPDATE inventory SET status='held',owner=?,expires=? WHERE show_id=? AND seat_id IN (${marks}) AND (SELECT count(*) FROM inventory WHERE show_id=? AND seat_id IN (${marks}) AND (status='available' OR (status='held' AND (expires<? OR owner=?))))=?`,
        )
        .bind(
          s.id,
          expires,
          input.showId,
          ...unique,
          input.showId,
          ...unique,
          now,
          s.id,
          unique.length,
        );
      // Holding the new selection and releasing the old one must share a transaction.
      // Otherwise two tabs in the same session can release one another's new hold.
      const releasePrevious = db()
        .prepare(
          `UPDATE inventory SET status='available',owner=NULL,expires=NULL WHERE owner=? AND status='held' AND (show_id!=? OR seat_id NOT IN (${marks})) AND (SELECT count(*) FROM inventory WHERE show_id=? AND seat_id IN (${marks}) AND status='held' AND owner=? AND expires=?)=?`,
        )
        .bind(s.id, input.showId, ...unique, input.showId, ...unique, s.id, expires, unique.length);
      const [result] = await db().batch([hold, releasePrevious]);
      if (result.meta.changes !== unique.length)
        return reply(
          { error: "One of those seats was just taken. Please choose again." },
          409,
        );
      return reply({ expires });
    }
    if (action === "checkout") {
      const input = checkoutSchema.parse(body);
      const previous = await db()
        .prepare("SELECT id FROM bookings WHERE owner=? AND request_id=?")
        .bind(s.id, input.requestId)
        .first();
      if (previous) return reply(previous);
      if (input.promo.trim() && !checkoutOffer(input.promo)) return reply({error:"This coupon is not valid. Remove it or choose an available demo offer."},400);
      if (input.outcome === "failure")
        return reply(
          {
            error:
              "The simulated payment failed. Your seats are still held. Try again.",
          },
          402,
        );
      if (input.outcome === "cancel")
        return reply(
          { error: "Test payment cancelled. No payment was taken." },
          400,
        );
      const {
        show,
        seats,
        blueprint: b,
      } = await ensureInventory(input.showId, catalog);
      if (screeningStarted(show)) {
        return reply({ error: "This screening has already started. Please choose another showtime." }, 409);
      }
      const ids = [...new Set(input.seats)];
      const invalidSelection = selectionError(input.seats, seats);
      if (invalidSelection) return reply({ error: invalidSelection }, 400);
      const selected = seats.filter((s) => ids.includes(s.id));
      const pricing = calculatePrice(
        selected,
        show,
        input.cart,
        input.promo,
        catalog.snacks,
      );
      if (input.promo.trim() && !pricing.discount) return reply({error:"This order no longer meets the coupon terms. Remove the coupon and try again."},400);
      const id = crypto.randomUUID();
      const token = crypto.randomUUID() + crypto.randomUUID();
      const now = Date.now();
      const marks = ids.map(() => "?").join(",");
      const snapshot = {
        show,
        movie: catalog.movies.find((m) => m.id === show.movieId),
        venue: catalog.venues.find((v) => v.id === show.venueId),
        auditorium: b.name,
        demo: true,
      };
      await db().batch([
        db()
          .prepare(
            `INSERT OR IGNORE INTO bookings (id,owner,user_id,show_id,seats,cart,pricing,snapshot,token,request_id,status,created) SELECT ?,?,?,?,?,?,?,?,?,?,'confirmed',? WHERE (SELECT count(*) FROM inventory WHERE show_id=? AND seat_id IN (${marks}) AND status='held' AND owner=? AND expires>?)=?`,
          )
          .bind(
            id,
            s.id,
            s.user_id,
            show.id,
            JSON.stringify(ids),
            JSON.stringify(input.cart),
            JSON.stringify(pricing),
            JSON.stringify(snapshot),
            token,
            input.requestId,
            now,
            show.id,
            ...ids,
            s.id,
            now,
            ids.length,
          ),
        db()
          .prepare(
            `INSERT INTO booking_seats (booking_id,show_id,seat_id) SELECT ?,show_id,seat_id FROM inventory WHERE show_id=? AND seat_id IN (${marks}) AND EXISTS (SELECT 1 FROM bookings WHERE id=?)`,
          )
          .bind(id, show.id, ...ids, id),
        db()
          .prepare(
            `UPDATE inventory SET status='booked',expires=NULL WHERE show_id=? AND seat_id IN (${marks}) AND EXISTS (SELECT 1 FROM bookings WHERE id=?)`,
          )
          .bind(show.id, ...ids, id),
        db()
          .prepare(
            "INSERT INTO payments (id,booking_id,amount,status,provider) SELECT ?,?,?,'succeeded','simulation' WHERE EXISTS (SELECT 1 FROM bookings WHERE id=?)",
          )
          .bind(crypto.randomUUID(), id, pricing.total, id),
      ]);
      const booking = await db()
        .prepare(
          "SELECT id FROM bookings WHERE id=? OR (owner=? AND request_id=?)",
        )
        .bind(id, s.id, input.requestId)
        .first();
      return booking
        ? reply(booking)
        : reply(
            {
              error:
                "Your seat hold expired. Return to the seat map and select your seats again.",
            },
            409,
          );
    }
    if (action === "cancel-booking") {
      const { id } = z.object({ id: z.string().uuid() }).parse(body);
      const record = await db()
        .prepare("SELECT * FROM bookings WHERE id=? AND (owner=? OR user_id=?)")
        .bind(id, s.id, s.user_id)
        .first();
      if (!record) return reply({ error: "Booking not found." }, 404);
      const snap = JSON.parse(record.snapshot as string);
      if (
        new Date(`${snap.show.date}T${snap.show.time}:00+05:30`).getTime() <
        Date.now()
      )
        return reply({ error: "Past screenings cannot be cancelled." }, 400);
      await db().batch([
        db()
          .prepare(
            "UPDATE inventory SET status='available',owner=NULL,expires=NULL WHERE (show_id,seat_id) IN (SELECT show_id,seat_id FROM booking_seats WHERE booking_id=?)",
          )
          .bind(id),
        db().prepare("DELETE FROM booking_seats WHERE booking_id=?").bind(id),
        db()
          .prepare("UPDATE bookings SET status='cancelled' WHERE id=?")
          .bind(id),
        db()
          .prepare("UPDATE payments SET status='refunded' WHERE booking_id=?")
          .bind(id),
      ]);
      return reply({ ok: true });
    }
    if (action === "manage-inventory") {
      const configured = (env as unknown as Record<string, string>).ADMIN_TOKEN;
      if (
        !configured ||
        req.headers.get("authorization") !== `Bearer ${configured}`
      )
        return reply(
          { error: "An administrator token is required to manage inventory." },
          403,
        );
      const input = z
        .object({
          showId: z.string().max(150),
          seats: z
            .array(z.string().regex(/^[A-Z]\d{1,2}$/))
            .min(1)
            .max(24),
          status: z.enum(["available", "blocked", "booked"]),
        })
        .parse(body);
      const { seats } = await ensureInventory(input.showId, catalog);
      const ids = [...new Set(input.seats)];
      if (ids.some((id) => !seats.some((s) => s.id === id && !s.blocked)))
        return reply({ error: "Invalid or structurally blocked seat." }, 400);
      const marks = ids.map(() => "?").join(",");
      const result = await db()
        .prepare(
          `UPDATE inventory SET status=?,owner=NULL,expires=NULL WHERE show_id=? AND seat_id IN (${marks}) AND (SELECT count(*) FROM inventory WHERE show_id=? AND seat_id IN (${marks}) AND (status!='held' OR expires<?))=? AND NOT EXISTS (SELECT 1 FROM booking_seats WHERE show_id=? AND seat_id IN (${marks}))`,
        )
        .bind(
          input.status,
          input.showId,
          ...ids,
          input.showId,
          ...ids,
          Date.now(),
          ids.length,
          input.showId,
          ...ids,
        )
        .run();
      return result.meta.changes === ids.length
        ? reply({ ok: true })
        : reply(
            {
              error:
                "Confirmed bookings or active holds protect one or more selected seats.",
            },
            409,
          );
    }
    if (action === "catalog") {
      const configured = (env as unknown as Record<string, string>).ADMIN_TOKEN;
      if (
        !configured ||
        req.headers.get("authorization") !== `Bearer ${configured}`
      )
        return reply(
          {
            error:
              "An administrator token is required to publish catalog changes.",
          },
          403,
        );
      const input = catalogSchema.parse(body);
      for (const venue of input.venues) for (const id of venue.blueprints) {
        if (!(await blueprint(id))) return reply({error:"Publish the referenced auditorium blueprint before assigning it to a venue."},400);
      }
      assertCatalog(input);
      const holds = await db()
        .prepare(
          "SELECT count(*) AS n FROM inventory WHERE status='held' AND expires>?",
        )
        .bind(Date.now())
        .first<{ n: number }>();
      if (holds?.n)
        return reply(
          {
            error:
              "Wait for active seat holds to finish before changing the demo catalog.",
          },
          409,
        );
      await db()
        .prepare(
          "INSERT INTO catalog_config (id,document,updated) VALUES ('active',?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,updated=excluded.updated",
        )
        .bind(JSON.stringify(input), Date.now())
        .run();
      return reply({ ok: true });
    }
    if (action === "blueprint") {
      const configured = (env as unknown as Record<string, string>).ADMIN_TOKEN;
      if (
        !configured ||
        req.headers.get("authorization") !== `Bearer ${configured}`
      )
        return reply(
          {
            error:
              "An administrator token is required to publish blueprint changes.",
          },
          403,
        );
      const data = blueprintSchema.parse(body);
      if (
        data.aisles.some((a) => a >= data.columns) ||
        data.screenWidth > data.width - 1
      )
        return reply(
          { error: "Aisles and screen must fit inside the configured room." },
          400,
        );
      const physicalSeats = makeSeats(data);
      if (new Set(physicalSeats.map(s=>s.id)).size !== physicalSeats.length || data.rowLengths?.some(n=>n>data.columns) || data.rowConfig?.some((r,i)=>i>=data.rows || (r.omitted||[]).some(n=>n>(data.rowLengths?.[i]??data.columns))))
        return reply({error:"Row labels must be unique and row configuration must match the seat grid."},400);
      if (data.screen) {
        const {
          width,
          height,
          position: [x, y, screenZ],
          rotationY = 0,
        } = data.screen;
        const halfX = (Math.abs(Math.cos(rotationY)) * width) / 2;
        const halfZ = (Math.abs(Math.sin(rotationY)) * width) / 2;
        if (
          Math.abs(x) + halfX > data.width / 2 - 0.5 ||
          y - height / 2 < 1.2 ||
          y + height / 2 > data.height - 0.5 ||
          screenZ - halfZ < -data.depth / 2 + 0.35 ||
          screenZ + halfZ > -data.depth / 2 + 3.5
        ) {
          return reply(
            {
              error:
                "The screen must fit within the front wall area, above the stage and below the ceiling.",
            },
            400,
          );
        }
      }
      if (
        physicalSeats.some(
          (seat) =>
            Math.abs(seat.x) > data.width / 2 - 0.6 ||
            seat.z > data.depth / 2 - 0.6 ||
            seat.y + 2 > data.height,
        )
      )
        return reply(
          { error: "The seating layout must fit inside the room." },
          400,
        );
      if (
        data.seatMap &&
        Object.values(data.seatMap).some(
          (id) => !physicalSeats.some((s) => s.id === id),
        )
      )
        return reply(
          { error: "Every model seat must map to a valid physical seat ID." },
          400,
        );
      await db()
        .prepare(
          "INSERT INTO blueprints (id,config,updated) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated=excluded.updated",
        )
        .bind(data.id, JSON.stringify(data), Date.now())
        .run();
      return reply({ ok: true });
    }
    return reply({ error: "Not found." }, 404);
  } catch (error) {
    return json(
      {
        error:
          error instanceof z.ZodError
            ? "Please check the values and try again."
            : error instanceof RequestError
              ? error.message
              : "Unable to complete the request.",
      },
      error instanceof RequestError ? error.status : error instanceof z.ZodError ? 400 : 500,
      s?.cookie,
    );
  }
}
export const GET = handler;
export const POST = handler;
