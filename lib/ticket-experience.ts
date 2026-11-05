// A navigation-only cue, never persisted booking authority. Reloading the app
// clears it, so a saved confirmation is shown without replaying checkout.
let arrivingBooking: string | null = null;

export function markTicketArrival(id: string) {
  arrivingBooking = id;
}

export function consumeTicketArrival(id: string) {
  const matches = arrivingBooking === id;
  if (matches) arrivingBooking = null;
  return matches;
}

export function bookingStatusLabel(status: string) {
  if (status === "confirmed") return "BOOKING CONFIRMED";
  if (status === "cancelled") return "CANCELLED";
  if (status === "failed") return "BOOKING FAILED";
  return "AWAITING CONFIRMATION";
}
