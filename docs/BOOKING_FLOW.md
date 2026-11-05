# Booking flow

1. Resolve the screening ID to its movie, venue, date, time, language, format, starting price and assigned auditorium.
2. Read or create that screening's immutable blueprint snapshot and independent inventory. Deterministic sample booked/blocked states seed the inventory once.
3. Select up to eight eligible seats in 3D or 2D. Recliner pairs are selected and validated together. The sidebar recomputes prices immediately.
4. Continue to acquire an eight-minute group hold through a conditional SQL update. It succeeds for every requested seat or none. The server rejects invalid, booked, blocked or competing held seats.
5. Select snacks and proceed to checkout. The remaining hold timer remains visible. An expired hold requires returning to seats.
6. Submit the simulated payment result. Failure/cancellation do not create a booking or consume the hold. Success recomputes prices, checks ownership/expiry and uses an atomic D1 batch to confirm booking, uniquely claim booking-seat rows, update inventory and record the simulation payment.
7. Only after successful checkout, a navigation-only cue identifies the arriving booking. The confirmation fetches the private saved record and checks `status === "confirmed"` before playing the 3.3-second ticket-dispenser sequence. A masked ticket feeds from the slot, reveals its saved details and QR, and receives a BOOKED stamp. Refreshes retrieve the existing record without replaying; explicit replay never calls checkout. Reduced motion immediately displays the finished ticket.
8. The final ticket supports opaque-token QR verification, PNG download, clean single-ticket printing and a direct booking-details link. My Tickets lists private upcoming, past and cancelled bookings. Cancellation before the show releases its inventory and records a simulated refund. Pending, failed, cancelled and inaccessible records never receive a confirmation stamp or active QR. See `CINEMATIC_TICKETS.md` for animation timing, accessibility and test coverage.

Idempotency uses a client UUID and unique (owner, request_id). Replays return the original booking ID. No card or bank credentials are collected. An unauthenticated guest can book; signing in associates that session's guest bookings with the account. Login rotates the random session token.
