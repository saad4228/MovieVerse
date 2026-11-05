import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  salt: text("salt").notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  expires: integer("expires").notNull(),
});
export const userWatchlist=sqliteTable("user_watchlist",{
 userId:text("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 movieKey:text("movie_key").notNull(),added:integer("added").notNull(),
},t=>[primaryKey({columns:[t.userId,t.movieKey]}),index("watchlist_user_added").on(t.userId,t.added)]);
export const profilePhotos = sqliteTable("profile_photos", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  image: text("image").notNull(),
  updated: integer("updated").notNull(),
});
export const inventory = sqliteTable(
  "inventory",
  {
    showId: text("show_id").notNull(),
    seatId: text("seat_id").notNull(),
    status: text("status").notNull(),
    owner: text("owner"),
    expires: integer("expires"),
  },
  (t) => [
    primaryKey({ columns: [t.showId, t.seatId] }),
    index("inventory_expiry").on(t.expires),
  ],
);
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    userId: text("user_id").references(() => users.id),
    showId: text("show_id").notNull(),
    seats: text("seats").notNull(),
    cart: text("cart").notNull(),
    pricing: text("pricing").notNull(),
    snapshot: text("snapshot").notNull(),
    token: text("token").notNull().unique(),
    requestId: text("request_id").notNull(),
    status: text("status").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [
    uniqueIndex("booking_idempotency").on(t.owner, t.requestId),
    index("bookings_user").on(t.userId),
    index("bookings_owner").on(t.owner),
  ],
);
export const bookingSeats = sqliteTable(
  "booking_seats",
  {
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id),
    showId: text("show_id").notNull(),
    seatId: text("seat_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.showId, t.seatId] })],
);
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
});
export const blueprints = sqliteTable("blueprints", {
  id: text("id").primaryKey(),
  config: text("config").notNull(),
  updated: integer("updated").notNull(),
});
export const showBlueprints = sqliteTable("show_blueprints", {
  showId: text("show_id").primaryKey(),
  config: text("config").notNull(),
});
export const catalogConfig = sqliteTable("catalog_config", {
  id: text("id").primaryKey(),
  document: text("document").notNull(),
  updated: integer("updated").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});

// Persistent discovery is separate from illustrative booking inventory.
export const discoveryMovies = sqliteTable("discovery_movies", {
 id:integer("id").primaryKey(),document:text("document").notNull(),title:text("title").notNull(),releaseDate:text("release_date").notNull(),
 language:text("language").notNull(),origins:text("origins").notNull(),genres:text("genres").notNull(),popularity:real("popularity").notNull(),
 rating:real("rating").notNull(),votes:integer("votes").notNull(),runtime:integer("runtime").notNull(),indiaRelease:text("india_release"),usRelease:text("us_release"),firstImported:integer("first_imported").notNull(),updated:integer("updated").notNull(),
},t=>[index("discovery_movie_title").on(t.title),index("discovery_movie_release").on(t.releaseDate)]);
export const discoveryCollections=sqliteTable("discovery_collections",{id:text("id").primaryKey(),generation:text("generation"),lastSuccess:integer("last_success"),lastAttempt:integer("last_attempt"),error:text("error")});
export const discoveryMemberships=sqliteTable("discovery_memberships",{collection:text("collection").notNull(),generation:text("generation").notNull(),movieId:integer("movie_id").notNull().references(()=>discoveryMovies.id),rank:integer("rank").notNull(),lastSeen:integer("last_seen").notNull()},t=>[primaryKey({columns:[t.collection,t.generation,t.movieId]}),index("discovery_membership_read").on(t.collection,t.generation,t.rank)]);
export const discoverySyncRuns=sqliteTable("discovery_sync_runs",{id:text("id").primaryKey(),kind:text("kind").notNull(),started:integer("started").notNull(),finished:integer("finished"),status:text("status").notNull(),report:text("report").notNull().default('{}')});
export const discoverySyncLock=sqliteTable("discovery_sync_lock",{id:integer("id").primaryKey(),owner:text("owner").notNull(),expires:integer("expires").notNull()});
export const discoverySettings=sqliteTable("discovery_settings",{id:text("id").primaryKey(),document:text("document").notNull()});
