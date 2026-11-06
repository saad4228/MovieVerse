# Approved repository security cleanup

Completed locally on 5 November 2026. Baseline HEAD: `20e3240`. No commits, history rewrites, staging, remote pushes or application deployments were performed. No open-source license was added.

## Preserved boundaries

- `.dev.vars` is byte-for-byte unchanged. Its contents and fingerprint are not published in this report.
- All previously inventoried local database files under `.wrangler/state` remain present. The application SQLite database passes a read-only `PRAGMA quick_check`.
- Existing application source under `app/`, `components/`, `lib/`, `worker/`, database schema/migrations, runtime assets, and third-party notices match their pre-cleanup tracked checksums.
- Every existing Git ref and HEAD is unchanged. Existing author identities and commit messages are preserved.
- The pre-existing untracked `docs/learning-guide/` scripts were left untouched.

## Edited files

| Path | Change |
| --- | --- |
| `.gitignore` | Added key/certificate, SQLite/journal, dump, session/HAR/trace, archive and generated-output exclusions. Public `.env.example` and authored SQL migrations remain visible. |
| `.env.example` | Clarified safe public placeholders, local Worker-secret placement, production separation and preservation of existing local state. No credential values added. |
| `README.md` | Added security commands, safe-setup/report links and an explicit statement that no open-source code license is granted. |
| `docs/CODEX_HANDOFF.md` | Replaced the original developer-specific Windows workspace path with a portable placeholder. |
| `package.json` | Added five security command aliases; dependency versions are unchanged and the lockfile was not changed. |
| `scripts/prepare-assets.mjs` | Replaced a hardcoded personal Downloads path with an explicit directory argument or MOVIEVERSE_ASSET_SOURCE. Missing/non-directory input fails before creating outputs. This optional legacy tool was not run against assets. |

## Added files

| Path | Responsibility |
| --- | --- |
| `SECURITY.md` | Private reporting instructions, handling of secrets/local data, tool limitations and rights boundary. |
| `docs/REPOSITORY_SECURITY.md` | Safe environment setup, scanner commands/scopes, CI behaviour and local-data preservation. |
| `docs/REPOSITORY_SECURITY_CLEANUP.md` | This report, including the complete deletion manifest and remaining findings. |
| `scripts/check-secrets.mjs` | Read-only current/staged/history scanning; reports locations/rules, not values. Privately compares against configured local secrets. |
| `scripts/check-repository-hygiene.mjs` | Detects private/generated publishable paths and probes required ignore/public-source behaviour. |
| `scripts/security/repository.mjs` | Dependency-free Git file/index/history readers shared by checks. |
| `scripts/security/secret-allowlist.json` | Fourteen exact path/rule/fingerprint exceptions for manually reviewed synthetic test credentials, without including the literal values. |
| `scripts/security/checks.test.mjs` | Nine scanner/hygiene regressions, including copied secrets, narrow exceptions, staged content, ignored private input and forced-tracked artifacts. |
| `.github/workflows/repository-security.yml` | Commit-pinned official actions, read-only permissions, no persisted checkout credential, no application secrets or dependency install. Not yet run on GitHub. |

## Deleted generated files

Exactly 51 ignored, untracked files were removed: 46 browser traces containing session cookies and five obsolete generated deployment archives. Total: 666,346,655 bytes (635.5 MiB).

Each archive was inspected before deletion and contained only `dist/` files. No unique source, migration, runtime asset or local database was deleted. Every target was resolved and checked against the approved workspace output directories; directories and reparse-point ancestry were rejected. The browser trace with no detected session cookie was retained.

| Exact relative path | Bytes | Reason |
| --- | ---: | --- |
| `outputs/ticket-test-results/ticket-experience-loading--6a597-retrieves-the-saved-booking/trace.zip` | 1,791,247 | Cookie-bearing browser trace |
| `outputs/ticket-test-results/ticket-experience-pending--f7e5a-records-never-claim-success/trace.zip` | 2,133,428 | Cookie-bearing browser trace |
| `outputs/ticket-test-results/ticket-experience-real-che-78490--and-print-never-book-again/trace.zip` | 4,397,812 | Cookie-bearing browser trace |
| `outputs/hmr-theatre/audit-theatre-mount-and-interruption-retain-DOM-ownership/trace.zip` | 17,442,342 | Cookie-bearing browser trace |
| `outputs/cleanup-last-checks/movies-background-Movies-l-958e7-reserves-discovery-controls/trace.zip` | 12,863,139 | Cookie-bearing browser trace |
| `outputs/cleanup-focused/camera-boundaries-fast-orb-5e635-r-seats-and-room-boundaries/trace.zip` | 16,393,231 | Cookie-bearing browser trace |
| `outputs/cleanup-focused/discovery-controls-city-ra-95666-g-and-open-the-chosen-movie/trace.zip` | 8,524,047 | Cookie-bearing browser trace |
| `outputs/cleanup-focused/expansion-movie-metadata-r-491de-y-connect-to-actual-records/trace.zip` | 8,377,917 | Cookie-bearing browser trace |
| `outputs/cleanup-focused/large-screen-seats-front-m-c67cf-r-screen-and-selected-seats/trace.zip` | 18,630,991 | Cookie-bearing browser trace |
| `outputs/cleanup-focused/large-screen-seats-single--dfab9-eview-and-mobile-exit-grand/trace.zip` | 12,257,688 | Cookie-bearing browser trace |
| `outputs/cleanup-final-browser/camera-boundaries-fast-orb-5e635-r-seats-and-room-boundaries/trace.zip` | 33,673,186 | Cookie-bearing browser trace |
| `outputs/cleanup-final-browser/expansion-movie-metadata-r-491de-y-connect-to-actual-records/trace.zip` | 7,463,015 | Cookie-bearing browser trace |
| `outputs/cleanup-final-browser/movies-background-Movies-l-958e7-reserves-discovery-controls/trace.zip` | 10,376,425 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/browsing-polish-movie-filt-a0097--failure-preserves-the-card/trace.zip` | 3,992,186 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/camera-boundaries-fast-orb-5e635-r-seats-and-room-boundaries/trace.zip` | 34,276,150 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/carousel-autoplay-automati-4d5e2-sses-the-catalogue-boundary/trace.zip` | 18,839,015 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/carousel-autoplay-manual-c-fadcb-he-active-movie-still-opens/trace.zip` | 15,708,426 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/discovery-controls-city-ra-95666-g-and-open-the-chosen-movie/trace.zip` | 9,444,734 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/dynamic-catalogue-D1-catal-a5e10-es-search-and-movie-details/trace.zip` | 5,063,143 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/expansion-movie-metadata-r-491de-y-connect-to-actual-records/trace.zip` | 7,962,666 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/genre-discovery-all-genre--322f7-y-through-detail-navigation/trace.zip` | 4,130,609 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/genre-discovery-genre-mobi-e164e-ng-integration-stay-compact/trace.zip` | 3,900,646 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/journeys-city-switching-an-4781b-g-preserve-venue-and-layout/trace.zip` | 22,063,375 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/journeys-Nagpur-movie-firs-882b3-very-booking-QR-and-history/trace.zip` | 7,531,853 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/journeys-reference-lobby-l-3366d-g-and-poster-wall-discovery/trace.zip` | 6,409,438 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/journeys-sample-film-hero--03896-ompact-showtime-comparisons/trace.zip` | 2,760,898 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/large-screen-enlarged-scre-9a247-layback-and-presets-working/trace.zip` | 33,707,171 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/large-screen-seats-single--93ed7-view-and-mobile-exit-luxury/trace.zip` | 29,518,979 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/large-screen-seats-single--dfab9-eview-and-mobile-exit-grand/trace.zip` | 14,313,643 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/media-polish-carousel-wrap-e514e--and-honours-reduced-motion/trace.zip` | 5,968,632 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/media-polish-date-changes--4c2b6-update-every-screening-date/trace.zip` | 3,740,331 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/movie-experience-refinemen-783e9-as-slightly-tighter-spacing/trace.zip` | 3,861,643 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/movies-background-Movies-l-958e7-reserves-discovery-controls/trace.zip` | 6,555,949 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/navigation-abort-supersede-af607-sable-without-script-errors/trace.zip` | 2,338,589 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/navigation-stream-a-supers-9ea94-lled-before-decoder-handoff/trace.zip` | 2,333,439 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/navigation-stream-navigati-6c906-ose-body-is-still-streaming/trace.zip` | 2,343,034 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/seat-polish-touch-and-redu-06842-nd-touch-drag-never-selects/trace.zip` | 12,699,934 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/theatre-interaction-screen-05ad0-pied-seats-stay-unavailable/trace.zip` | 1,845,140 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/theatre-performance-paused-theatre-stops-drawing-when-idle/trace.zip` | 13,874,444 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/ticket-design-homepage-nav-ef635-routes-retain-glass-styling/trace.zip` | 8,397,107 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/ticket-design-released-fil-a64d4--they-have-local-screenings/trace.zip` | 2,411,635 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/ticket-experience-mobile-t-2b6b1-otion-changes-finish-safely/trace.zip` | 2,503,341 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/ticket-experience-real-che-78490--and-print-never-book-again/trace.zip` | 4,991,042 | Cookie-bearing browser trace |
| `outputs/cleanup-browser/ticket-stamp-stamp-follows-eb27e--refresh-does-not-replay-it/trace.zip` | 6,663,329 | Cookie-bearing browser trace |
| `test-results-native/audit-theatre-mount-and-interruption-retain-DOM-ownership/trace.zip` | 21,088,629 | Cookie-bearing browser trace |
| `test-results-native/journeys-3D-sample-film-pl-9c475-spective-and-2D-alternative/trace.zip` | 2,954,267 | Cookie-bearing browser trace |
| `outputs/movieverse-deploy.tar.gz` | 6,864,532 | Obsolete dist-only deployment archive |
| `outputs/movieverse-expansion.tar.gz` | 95,909,909 | Obsolete dist-only deployment archive |
| `outputs/movieverse-hd-update.tar.gz` | 27,716,520 | Obsolete dist-only deployment archive |
| `outputs/movieverse-reference-update.tar.gz` | 6,869,996 | Obsolete dist-only deployment archive |
| `outputs/movieverse-video-refinement.tar.gz` | 50,467,813 | Obsolete dist-only deployment archive |

## Verification

| Check | Result |
| --- | --- |
| `npm run security:test` | Passed: 9 tests. |
| `npm run security:check` | Passed: no unreviewed findings; 48 ignore-rule probes checked. |
| `npm run security:history` | Passed: no unreviewed findings in locally reachable historical text blobs. No history changes. |
| `npm test` | Passed: 23 files, 149 tests. |
| `npm run typecheck` | Passed. |
| ESLint on the four new JavaScript tooling files | Passed. This is not a claim that repository-wide existing lint findings were fixed. |
| Syntax checks and optional asset-tool missing-input check | Passed; expected usage error occurred before any asset changes. |
| Preservation/deletion verification | Passed: private environment unchanged, DB files present, DB quick-check OK, no cookie-bearing trace archives remaining in the audited output locations, all 51 targets absent, HEAD/refs unchanged. |
| Workflow | Added locally only; remote CI is not claimed to have run. |

The complete browser suite and production build were not rerun for this repository-only cleanup. Application code, dependencies and runtime assets were not changed. Existing browser/lint limitations from the code-quality audit remain.

## Dependency advisories requiring separate follow-up

An explicit `npm audit --json` completed and reported **34 findings: 1 critical, 15 high, 17 moderate and 1 low** across direct/transitive packages. It exited nonzero because findings remain. These are registry audit classifications, not proof that every listed code path is exploitable in MovieVerse.

| Direct dependency reported by npm | Severity |
| --- | --- |
| `@cloudflare/vite-plugin` | high |
| `drizzle-kit` | moderate |
| `eslint-config-next` | moderate |
| `next` | critical |
| `react-server-dom-webpack` | high |
| `sharp` | high |
| `vinext` | high |
| `vite` | high |
| `wrangler` | high |
| `zod` | high |

The critical package classification is `next`. This repository uses Vinext rather than a conventional Next server, so advisory applicability must be reviewed against actual runtime imports/routes rather than assumed or dismissed. No package was upgraded, removed, or force-fixed in this cleanup. Dependency remediation requires a focused compatibility review with application tests/build checks.

The raw advisory report is retained privately at `outputs/security-dependency-audit.json`. `.npmrc` still suppresses automatic install-time audit output; explicit dependency auditing remains necessary. The repository text scanner is not a dependency-vulnerability scanner.

## Limits

The repeatable scanners are heuristics and do not certify an absence of all secrets or vulnerabilities. They do not decode every binary, inspect ignored private state as public source, prove production configuration, or run penetration tests. This cleanup did not revoke provider credentials because no published credential exposure was confirmed in the audit. If a private archive was shared outside this checkout, separately assess the credentials and sessions it contained.

## Publication and rights

Changes remain local for user review. No push is authorized by this report. No MIT or other open-source license is granted; existing third-party notices remain unchanged. The next publication step requires the user's explicit approval.
