import {
  sqliteTable,
  text,
  integer,
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
