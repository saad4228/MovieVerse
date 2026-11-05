# Personal Cinema Lounge and profile photos

The Profile page keeps the existing amber cinema artwork and transparent navbar. Its content is constrained to 1280px, with a personal welcome, a translucent identity panel, balanced navigation cards, a compact guest-booking notice, and a smaller footer. Profile-only styles leave Demo Studio and other pages alone.

## Add your own photo

Choose **Add photo** or the camera icon on `/account`, select a JPEG, PNG or WebP file up to 8 MB, review the circular preview, and press **Save photo**. The browser centre-crops and resizes the photo to 512×512, then re-encodes it as JPEG. This strips original metadata and keeps storage and delivery small. Photos can be replaced or removed; removing one restores the account initial.

The photo is persisted in a separate D1 `profile_photos` table keyed by the authenticated user. It survives refreshes and later logins. No local-storage-only or fake upload is used. The original user name/email, login, password and session records are untouched.

## Backend and migration

- `GET /api/profile` returns the signed-in user's private photo URL, or `null`.
- `GET /api/profile-photo` serves only the current user's JPEG with private/no-store, nosniff and restrictive content-security headers.
- `POST /api/profile-photo` stores a prepared photo or removes it when `image` is `null`.
- Guests receive 401. The request never accepts a user ID. Database operations bind the authenticated session's user ID, so another account cannot read or remove the photo.
- Upload bodies are limited while streaming, even without Content-Length. The backend validates the data URL, JPEG markers and square dimensions (32–512px), with a maximum 180,000-character prepared image. SVG and arbitrary files are rejected.

Migration `drizzle/0003_redundant_shinko_yamashiro.sql` creates only the new profile-photo table. It has been applied to this checkout's local D1 database. Apply that migration to the target database through the normal deployment migration process before enabling photo uploads there. The schema and Drizzle migration metadata are included; no hosted database was changed.

## Files

- `components/Account.tsx`: personal welcome, identity composition and guest notice.
- `components/ProfilePhoto.tsx`: picker, preview, client image preparation, save/change/remove states.
- `components/MovieVerse.tsx`: account-only footer styling scope.
- `app/personal-lounge.css` and `app/layout.tsx`: responsive presentation and stylesheet import.
- `lib/profile-photo.ts` and `app/api/[action]/route.ts`: bounded image validation and authenticated storage/delivery.
- `db/schema.ts`, `drizzle/0003_redundant_shinko_yamashiro.sql`, `drizzle/meta/0003_snapshot.json`, `drizzle/meta/_journal.json`: additive schema migration.
- `tests/profile-photo.test.ts` and `tests/e2e/profile-lounge.spec.ts`: validation, upload lifecycle, access boundaries and layout checks.

## Verification

The 106-test unit suite passed, including valid JPEGs, corrupt data, SVG, invalid dimensions, oversized data and streaming-body limits. Browser tests exercised actual local registration, upload/preview, refresh persistence, replacement, removal, guest rejection, another account's access isolation, navigation cards and sign-out.

Screenshots are saved as `test-results/personal-lounge-{1920,1440,1366,768,390}.png`. Checked sizes include 1920×1080, 1440×900, 1366×768, tablet and 390×844 mobile, without horizontal overflow.
