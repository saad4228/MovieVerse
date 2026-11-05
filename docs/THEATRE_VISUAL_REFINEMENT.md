# Booking theatre visual refinement

The `/booking/:show/seats` route now uses a 72px dark-glass navbar (68px on mobile), with a translucent charcoal gradient, 12px backdrop blur and no bottom border. The movie information strip is approximately 52px tall on desktop, with the original title, venue, date, time, language, format, back link and certificate. Longer mobile metadata wraps naturally.

The existing auditorium receives a booking-only `refined` presentation flag. Other shared scene uses, including Demo Studio, keep their original appearance. This flag slightly lowers the cool ambient/fill wash, strengthens warm key/architectural light, increases the matte acoustic-panel texture response, softens ceiling accents, reduces stage reflections and refines the bronze screen trim. Shadow normal bias is reduced for closer seat contact, with a softer light penumbra and unchanged shadow-map budgets.

`bookingTheatrePresentation` creates a render-only blueprint copy with an aperture enlargement capped at 2.5%, constrained by side/ceiling clearance. Aspect ratio, horizontal centre, screen depth and bottom edge are preserved. Imported auditorium models and rotated custom screens are retained exactly. Screen/frame/stage and camera helpers use the same rendered blueprint so their geometry remains coordinated. The original inventory blueprint and every seat coordinate, ID, category and price are unchanged.

## Files

- `components/Navigation.tsx`: booking-seat-route navbar variant.
- `components/seat-workspace.css`: scoped navbar and movie-strip styling.
- `components/BookingFlow.tsx`, `components/SeatScene.tsx`: opt in to the refined presentation only for the booking theatre.
- `components/auditorium/TheatreLighting.tsx`: balanced lighting and shadow treatment.
- `components/AuditoriumDetails.tsx`, `components/auditorium/CinemaScreen.tsx`: acoustic, ceiling, frame and stage material refinement.
- `lib/theatre-presentation.ts`: bounded aperture adjustment without seat changes.
- `tests/theatre-presentation.test.ts`, `tests/e2e/theatre-visual-refinement.spec.ts`: invariants and browser verification.

## Verification

108 unit tests passed. The new checks compare every seat before/after the presentation change, check aspect/clearance, and preserve imported/rotated custom screens.

Browser checks passed for glass styling, compact dimensions, active video texture playback, screen sizing, screen clicks leaving selection unchanged, responsive resizing, the real hold-to-snacks transition and restoration of the existing snacks navbar. Existing workspace checks passed at 1280×720, including multiple-seat selection/removal/undo, category selection, camera presets, 2D selection, selected-seat preview and continuation through snacks to checkout.

Screenshots: `test-results/theatre-refined-1440.png` and `test-results/theatre-refined-mobile.png`. The standard booking-sidebar layout and all booking/pricing/checkout handlers were preserved.
