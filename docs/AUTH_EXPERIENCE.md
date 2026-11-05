# Authentication presentation

Login and registration share a transparent navbar variant and a viewport-sized desktop composition. The left panel uses 16 distinct existing catalogue posters, alternating English and regional catalogue entries where available, with static depth blur, rotation, and a navy gradient. Posters reserve their layout space; the collage does not request movie details or depend on a live TMDB connection.

The slogan is positioned above the panel's vertical midpoint. The right panel keeps the real authentication form, password visibility control, validation messages, guest link, and security/demo disclaimer. The large site footer is omitted on authentication routes. Mobile switches to one column, and short screens can scroll naturally.

Mode links use the framework-supported History API to update the URL without recreating the collage. Only the form content fades on a mode change. Direct URL loading and ordinary links remain available. Motion honors reduced-motion preferences.

## Files changed

- `components/Account.tsx`: form presentation, loading indicator, mode transition.
- `components/AuthPosterCollage.tsx`: stable catalogue artwork composition.
- `components/Navigation.tsx`: authentication-only transparent navbar variant.
- `components/MovieVerse.tsx`: authentication route shell, stable form host, footer omission.
- `app/auth-experience.css`: scoped layout, collage, focus and entrance styles.
- `app/globals.css`: removed the superseded desktop/mobile authentication styles.
- `app/layout.tsx`: imports the authentication stylesheet.
- `tests/e2e/auth-design.spec.ts`: viewport, artwork, navigation, motion, and real authentication verification.

## Verification

Both login and registration fit without page scrolling at 1920×1080, 1600×900, 1440×900, 1366×768, and 1280×720. Tests checked transparent navigation, visible disclaimer, 16 distinct loaded images with at least 300px source width, stable collage DOM across mode changes, and password visibility. Mobile verification used 390×844. A 1280×560 check verified access through natural scrolling with reduced motion enabled.

The browser tests exercised real local registration, rejected an incorrect password, signed in successfully, and continued to Movies as a guest. Authentication backend, password rules, hashing, and session handlers were not edited.

Screenshots are saved under `test-results/auth-register-{1920,1440,1366}.png`, `test-results/auth-login-{1920,1440,1366}.png`, and `test-results/auth-register-mobile.png`.
