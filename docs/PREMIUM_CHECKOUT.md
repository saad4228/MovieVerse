# Premium checkout

Checkout preserves the existing seat holds, snack cart, booking API and confirmation route. The velvet background remains shared with Snacks, with the existing 78% dark overlay.

## Payment status

No live payment provider is integrated or configured. All three method cards explicitly use the existing simulation endpoint; they do not collect banking credentials. Confirmation follows a successful backend booking response. Customer details remain local to the form; no email is sent.

## Coupons

- FIRSTSHOW: 10% off tickets, capped at INR 100.
- SNACKTIME: 10% off snacks, capped at INR 50.
- Both are illustrative demo promotions.
- A single normalized code is persisted with the current booking. Changing show/city or clearing the booking resets it.
- Shared pricing calculates the discount once. The backend validates the code and eligibility against its own catalogue.
- Removing a coupon restores the original total, including unchanged fees and taxes. Removing snacks invalidates an ineligible snack coupon.
- Celebration effects respect reduced motion.

## Implementation

- `components/CheckoutExperience.tsx`: customer validation, offers, payment methods, submission states and duplicate-submit protection.
- `components/checkout-experience.css`: scoped checkout surfaces, responsive styling and motion.
- `components/BookingFlow.tsx`: checkout integration and shared booking summary.
- `lib/checkout-offers.ts`, `lib/booking.ts`: offer rules and shared pricing.
- `lib/store.ts`: booking-scoped coupon persistence.
- `app/api/[action]/route.ts`: authoritative coupon validation.
- `tests/checkout-offers.test.ts`, `tests/e2e/premium-checkout.spec.ts`: pricing and checkout regression coverage.

Browser verification covers coupon replacement/removal, refresh and snack navigation, invalid inputs/codes, mobile and reduced motion, payment failure/cancellation, preserved seat holds, duplicate submission and backend-confirmed totals. Existing booking-to-ticket and atomic hold/idempotency journeys also pass.

Production payment processing still requires a real provider adapter, credentials and verified payment confirmation; this change does not claim live charging support.
