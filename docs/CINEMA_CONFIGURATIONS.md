# Cinema-specific auditoriums

MovieVerse now ships five deterministic illustrative templates: traditional Grand (336 seats, rear balcony), Studio (168), Lounge (84 paired recliners), Premiere multiplex (252), and Horizon large-format (420). These are not measured real-world interiors or certified IMAX rooms.

## Shared configuration and booking

`lib/catalog.ts` remains the source for seat generation. Both views consume the server-generated seats, and checkout prices consume those same seat records. Seat IDs are stable row labels plus seat numbers; omitted seats leave numbering gaps. Sections and levels accompany each seat. The 2D map positions seats from their actual horizontal coordinates and provides stalls/balcony switching.

`lib/blueprint-config.ts` validates published configurations. Existing admin authentication remains required. Unique blueprint IDs allow each cinema/screen to have its own template copy and overrides. Publish a blueprint through the existing admin blueprint endpoint, then reference its ID in the venue's blueprints/screenings configuration. The administrator UI supports basic dimensions and an Advanced auditorium configuration JSON editor. Load the current draft, edit overrides or a unique ID, validate/apply locally, then publish separately using the existing authenticated workflow. Renaming a draft preserves its row overrides.

Supported overrides: room dimensions; row lengths; aisle positions and width; spacing, slope, curvature and stagger; row labels, classes, omitted/blocked/accessible seats; custom class prices and colours; explicit screen geometry/aspect; stage dimensions; curtains, wall/floor/light colours and ceiling treatment; rear balcony row count and elevation. The current procedural balcony is a raised rear section, not overlapping stacked seating floors. Imported models remain supported through their seat mapping.

Existing show snapshots remain immutable. New configuration changes apply when an unsnapshotted screening first creates inventory. No existing show IDs or saved booking seat identities are migrated. New Premiere and Horizon demo venues are added through catalogue revision 4 without changing existing venue assignments. Operator-edited blueprints retain their overrides.

## Visual and interaction changes

Traditional halls use velvet curtains and a wood-toned stage; studio and multiplex rooms use minimal framing; the large-format room has deeper, steeper seating and a dominant screen; luxury retains wider paired chairs. Geometry, camera bounds and screen geometry remain derived from each blueprint. Existing instanced contoured chairs, cupholders, footrests, piping, shadows and fixed hitboxes are retained. Curved seats rotate both visual instances and hitboxes. The selected-seat highlight is turquoise in both maps; other category colours remain distinct.

Selected seats appear as compact removable pills with class and price. Category cards show descriptions, configured prices and remaining simulated inventory. Checkout remains pinned and mobile retains its bottom sheet. Playback, seat-preview controls and ticket generation are preserved.

## Files

- Data: `lib/catalog.ts`, `lib/catalog-config.ts`, `lib/catalog-upgrade.ts`, `lib/blueprint-config.ts`, `lib/booking.ts`, `lib/auditorium.ts`, `lib/seat-presentation.ts`.
- API: `app/api/[action]/route.ts`.
- Presentation: `components/BookingFlow.tsx`, `components/SeatScene.tsx`, `components/seat-workspace.css`, `components/AuditoriumDetails.tsx`, `components/auditorium/SeatRenderer.tsx`, `components/auditorium/CinemaScreen.tsx`, `components/auditorium/TheatreLighting.tsx`.
- Checks: `tests/booking.test.ts`, `tests/auditorium-config.test.ts`, `tests/e2e/auditorium-config.spec.ts`.

Browser evidence is saved as `outputs/auditorium-{grand,classic,luxury,multiplex,large-format}.png`. Software WebGL checks are not a hardware FPS benchmark.


## Completed verification

Typecheck, production build and all 96 unit tests passed. Twenty distinct browser checks passed across the five auditorium configurations, MP4/HLS/YouTube playback, five desktop sizes, tablet/mobile sheets, cinema switching, exact hover/click and physical lift, disabled seats, decorative screen, and full booking/payment-retry/QR/history flow. One development-reload-interrupted desktop check passed when rerun against settled code. Final build retains the existing large-chunk and vinext route-classification warnings.

## Follow-up completion

Advanced settings are now editable in the admin UI with shared validation. Balcony viewpoint targets use the generated balcony seats, and configured lighting colours drive the main and wall lights as well as architectural accents. Invalid, duplicate or contradictory row overrides are rejected. Follow-up checks: typecheck, 98 unit tests and the advanced-admin browser test passed.
