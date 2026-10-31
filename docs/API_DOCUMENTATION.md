# API

All endpoints use `/api/:action`. Private state uses a random HttpOnly SameSite session cookie, stored hashed in D1. JSON mutations reject cross-origin requests. Zod validates input and SQL is parameterised. Responses are not cached. The catalog endpoint is public within the Site's access policy; ticket verification reveals only nonpersonal booking state/movie/seats.

| Method / action | Input / result |
| --- | --- |
| GET session | Returns current account or guest and initialises the session cookie |
| POST register | name, email, password (8–128 characters); rotates session |
| POST login | email, password; rate limited; rotates session |
| POST logout | Invalidates the current session and clears its cookie |
| GET catalog | Returns active cities, movies, venues, snacks and blueprints |
| GET inventory?show=ID | Returns resolved screening, snapshot blueprint, seats and show-specific state |
| POST hold | showId, seats[1..8]; returns eight-minute expiry or 409 |
| POST release | Releases all held seats owned by this session |
| POST checkout | showId, seats, cart quantities, promo, requestId UUID, outcome success/failure/cancel; returns booking ID |
| GET tickets | Private session/account bookings with immutable display snapshots |
| POST cancel-booking | Owned booking UUID; before-showtime cancellation and inventory release |
| GET ticket?token=TOKEN | Nonpersonal verification for an opaque QR reference |
| POST blueprint | Validated physical configuration; requires administrator bearer token |
| POST catalog | Complete validated configuration document; administrator token; rejects active holds |
| POST manage-inventory | showId, seats[1..24], target state; administrator token; preserves confirmed bookings/active holds |

Admin writes are disabled unless ADMIN_TOKEN is configured in the Worker environment. No token is exposed to client source. The Studio receives it only from an administrator's password field and sends it in an Authorization header. It is not persisted by the application.

The default scheduling service derives seven dates in Asia/Kolkata. Venue `times` can override its four default times. Screening IDs are venue~movie~date~HHmm. Future live-provider adapters should preserve explicit auditorium assignment and server-owned inventory validation.
