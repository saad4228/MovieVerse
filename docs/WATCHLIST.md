# Account Watchlist

Watchlist is available at `/watchlist`, through the profile page and the footer. Movie details, homepage and listing cards share the same optimistic client state. Guests are sent to sign in and returned to their movie afterward.

## Storage and access

`user_watchlist` stores only the authenticated user's ID, a canonical movie reference and the saved timestamp. Its composite primary key prevents duplicates. Movie metadata is resolved from the existing catalogue; saving does not duplicate movie records. All reads and writes use the existing session and same-origin API protections. Archived movie references remain removable.

`GET /api/watchlist` reads the current account's collection. `POST /api/watchlist` accepts only `{ id, saved }`; account IDs supplied by clients are rejected. Responses are private and not cached. Client state is cleared on account changes and synchronized across tabs. Failed mutations roll back with an error notification.

## Deployment

Migration `drizzle/0005_account_watchlist.sql` has been applied to the local development database. Apply pending D1 migrations to the production DB using its configured Wrangler deployment before enabling the feature there. No production migration or deployment was performed by this task. No additional credentials or database are needed.

The local database predates the Wrangler migration journal: `npm run db:local` currently attempts migration 0000 and fails because `blueprints` already exists. The Watchlist SQL was applied directly and its table was verified through the real API tests. Reconcile the existing migration baseline before using the bulk migration command on this database; do not recreate or delete its tables. The production build includes migration 0005 in `dist/server/drizzle`.

## Verification

- `npm run typecheck`
- `npm test -- --run`
- `npx playwright test tests/e2e/watchlist.spec.ts tests/e2e/movie-experience-refinements.spec.ts --config playwright.hardware.config.ts`
- `npm run build`

Unit tests cover persistence, duplicate prevention, canonical references, user isolation, validation, account-change races and mutation rollback. Browser tests exercise real backend signup/login, saving, cross-tab updates, refresh, logout/login persistence, account isolation, homepage controls, filters, search, sorting, empty states and recovery from injected request failures. Desktop and mobile screenshots are written to `outputs/watchlist-desktop.png` and `outputs/watchlist-mobile.png`.

Availability distinguishes demo screenings, TMDB release-market discovery and released titles; it does not imply live cinema inventory.
