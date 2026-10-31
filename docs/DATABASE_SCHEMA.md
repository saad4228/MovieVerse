# Database schema

Schema source: `db/schema.ts`. Migrations: `drizzle/0000_rainy_unus.sql`, `0001_curvy_jack_power.sql`, `0002_glorious_energizer.sql`. Apply them once, in order. They are schema-only; runtime seed inventory is created outside migrations.

| Table | Identity and relationship |
| --- | --- |
| users | UUID primary key; unique normalised email; name, PBKDF2 password and random salt |
| sessions | SHA-256 of random cookie token; optional user foreign key; expiry |
| inventory | Composite primary key (show_id, seat_id); status, owner session, hold expiry |
| bookings | UUID, owner session, optional user FK, screening ID, seats/cart/pricing/snapshot JSON, unique random verification token, state, timestamp |
| booking_seats | Composite primary key (show_id, seat_id); booking FK; prevents double confirmation |
| payments | UUID, booking FK, amount, state, simulation provider |
| blueprints | Blueprint ID, validated active configuration, updated timestamp |
| show_blueprints | Screening ID, immutable physical layout snapshot |
| catalog_config | Active validated catalog document and timestamp |
| rate_limits | Hashed email key, attempt counter and window expiry |

Booking uniqueness also covers (owner, request_id), allowing idempotent retries. User and owner indexes support private ticket history. Inventory expiry is indexed.

Cities, cinema venues, film metadata, languages, genres, formats, snacks and auditorium assignments are typed configuration entities, persisted as a validated versioned JSON document when edited. They are not separate relational catalog tables in this demo. Referential validation ensures venue city/movie references exist and IDs are unique. This intentionally keeps a small replaceable catalog separate from transactional booking state. A future PostgreSQL adapter can normalise these configuration entities; it must retain the transactional uniqueness and ownership rules.
