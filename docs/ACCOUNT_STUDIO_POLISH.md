# Tickets, Profile and Demo Studio polish

## Changes

- My Tickets empty and error states now render actions separately from their descriptions. Scoped styles give headings, text, tabs and booking metadata readable line spacing. Ticket data, printing layouts, QR generation and the confirmation animation are unchanged.
- Profile and Demo Studio share the supplied `Luxurious Amber Cinema Interior.png`, converted at its original 1672×941 dimensions to a 46.8 KB WebP asset. A preloaded, fixed layer uses `cover` and CSS-only responsive positioning; no measurements or delayed repositioning are needed.
- Transparent navigation is applied only to `/account` and `/admin`. Their existing navigation controls remain intact.
- Profile identity and navigation cards have translucent surfaces, warm borders, clear text hierarchy and restrained entrance/hover motion. Mobile uses a two-column avatar/detail grid, with Sign Out below the identity details. Sign Out now reports its loading state and preserves error feedback.
- Studio controls and visualisations retain their existing surfaces and behavior; the notice, tabs and editor receive scoped translucent styling.

## Files

`components/Account.tsx`, `components/ui.tsx`, `components/MovieVerse.tsx`, `components/Navigation.tsx`, `components/AmberCinemaBackground.tsx`, `app/layout.tsx`, `app/account-studio.css`, `public/assets/amber-cinema-interior.webp`, and `tests/e2e/account-studio-polish.spec.ts`.

## Verification

Browser checks cover the Upcoming/Past/Cancelled empty states, CTA separation and text spacing at desktop, tablet and mobile widths. Profile tests use an actual local registration and check dynamic identity, navigation, sign-out, transparent headers, stable artwork during scrolling, and mobile identity width. Studio tabs and the existing advanced auditorium configuration validation passed.

Screenshots are in `test-results/profile-{1920,1440,1366,768,390}.png`, `test-results/studio-{1920,1440,1366,390}.png`, and `test-results/tickets-empty-{1920,1440,1366,768,390}.png`. Desktop heights include 1080, 900 and 768; mobile is 390×844.

TypeScript and the production build passed. Existing ticket regressions verify the dynamic ID, QR display, copy, downloads, desktop/mobile cards, printer animation, print invocation and PDF export. Reduced-motion media disables the new entrance and hover transitions.

The wider legacy `ticket-design` run also reported two outdated assertions outside this change: one expects glass navigation on Movies (the existing Movies route uses its transparent variant), and one expects Udta Teer to have no demo screenings although the current catalogue provides them. Neither route behavior was changed for this task. The ticket/export/multiple-booking tests in that run passed.
