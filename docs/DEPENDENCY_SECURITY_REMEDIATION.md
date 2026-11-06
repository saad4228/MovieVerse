# MovieVerse dependency security remediation

Subsequent browser and repository-wide lint fixes are tracked separately in [Browser and lint remediation](BROWSER_LINT_REMEDIATION.md). The results below retain the original dependency-remediation checkpoint.

Audit date: 5 November 2026. Local branch: `security/dependency-remediation`.
Baseline commit: `20e3240`. Existing repository-cleanup edits were already uncommitted and were preserved. No history rewrite, push, deployment, license grant, or database migration was performed.

## Result and scope

| Severity | Before | After |
| --- | ---: | ---: |
| Critical | 1 | 0 |
| High | 15 | 0 |
| Moderate | 17 | 0 |
| Low | 1 | 0 |
| **Total package findings** | **34** | **0** |

These are npm's package-level findings, including parent packages flagged because of vulnerable children; they are not 34 independent CVEs. The final audit includes development dependencies. Zero reported advisories is not a guarantee of complete security or production readiness.

The project still uses Vinext/Vite to run Next-style App Router code on Cloudflare Workers with D1. It was not converted to a conventional Next server. Node 24.18.0 was used; the upgraded Wrangler requires Node 22 or later. npm generated the lockfile through normal installs and targeted updates, followed by a clean `npm ci`. No force fix, legacy peer bypass, manual lockfile edits, vulnerability suppression, or dependency removal to hide findings was used.

## Critical finding investigated first

`next@16.3.4` was a direct production dependency. npm grouped several advisories under it, including remote-code-execution risks in image generation, native image optimization and cached App Router responses. Fixed versions differ by advisory; `16.4.5` is outside all affected ranges in the recorded audit.

MovieVerse serves requests through Vinext. Inspection found no direct `next/og`, `next/image`, `ImageResponse`, or `use cache` usage in the application directories searched. This reduces evidence of exposure to those particular code paths; it does not prove that every transitive path is unreachable. The vulnerable dependency was upgraded within Next 16 rather than dismissed.

Primary references:

- [Next image generation advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
- [Next native image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw)
- [Next cached response advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr)

React, React DOM and React Server DOM Webpack were upgraded together from `19.2.6` to `19.2.9`, staying on the same minor release. The dependency tree has no missing, invalid or conflicting peer dependencies.

## All 34 original package findings

“Production” and “development” below describe the baseline lockfile classification. Development packages can still affect generated production code or deployment tooling; this classification does not dismiss their risk. An unchanged parent's version can be safe after fixing its vulnerable child.

| Package | Severity | Direct/transitive; use | Remediation |
| --- | --- | --- | --- |
| `@babel/core` | Low | Transitive, development; React/Vite transforms | `7.29.0` → `7.29.13`. |
| `@cloudflare/vite-plugin` | High | Direct, development; Worker dev/build integration | `1.37.1` → `1.67.0`, with compatible Wrangler. |
| `@esbuild-kit/core-utils` | Moderate | Transitive, development; Drizzle's legacy loader | Parent remains `3.3.2`; scoped esbuild override fixes its child. |
| `@esbuild-kit/esm-loader` | Moderate | Transitive, development; Drizzle | Remains `2.6.5`; vulnerable esbuild descendant patched. |
| `@typescript-eslint/eslint-plugin` | Moderate | Transitive, development; ESLint | Remains `8.59.3`; minimatch descendant patched. |
| `@typescript-eslint/parser` | Moderate | Transitive, development; ESLint | Remains `8.59.3`; minimatch descendant patched. |
| `@typescript-eslint/type-utils` | Moderate | Transitive, development; ESLint | Remains `8.59.3`; minimatch descendant patched. |
| `@typescript-eslint/typescript-estree` | Moderate | Transitive, development; ESLint parser | Remains `8.59.3`; scoped minimatch override. |
| `@typescript-eslint/utils` | Moderate | Transitive, development; ESLint | Remains `8.59.3`; minimatch descendant patched. |
| `@vercel/og` | Moderate | Transitive, development classification; Vinext image tooling | `0.8.6` → `1.0.3` through Vinext, plus patched compression descendant. |
| `baseline-browser-mapping` | Moderate | Transitive, production classification; browser compatibility data | `2.10.30` → `2.11.35`. |
| `brace-expansion` | High | Transitive, development; glob expansion | `1.1.14` → `1.1.21`; `5.0.6` → `5.0.12`. |
| `browserslist` | High | Transitive, development; build target selection | `4.28.2` → `4.29.5`. |
| `drizzle-kit` | Moderate | Direct, development; schema/migration generation | `0.31.10` → `0.31.11`, plus loader override. npm's suggested downgrade to `0.18.1` was rejected. |
| `esbuild` | Moderate | Transitive, development; transforms/bundling | Legacy loader `0.18.20` → `0.25.12`; root `0.28.0` → `0.28.2`; Wrangler's `0.27.3` replaced through its parent upgrade. Existing safe `0.25.12` remains. |
| `eslint-config-next` | Moderate | Direct, development; lint configuration | `16.3.4` → `16.4.5`, plus minimatch override. npm's suggested Next 15 config downgrade was rejected. |
| `fast-uri` | Moderate | Transitive, production classification; schema tooling | `3.1.7` → `3.1.9`. |
| `fflate` | Moderate | Transitive, development; Satori compression | Affected `0.7.4` → `0.7.5` using scoped override. Other `0.6.11` and `0.8.3` copies are outside this advisory's affected range. |
| `image-size` | High | Transitive, development; old Vinext image tooling | `2.0.2` no longer included by the upgraded parent. Not manually removed. |
| `js-yaml` | High | Transitive, development; configuration parsing | `4.1.1` → `4.3.2`. |
| `miniflare` | High | Transitive, development; Cloudflare local runtime | `4.20260515.0` replaced by parent-selected `5.20261101.0-beta` and `5.20261103.0-beta`. These versions come from the stable Cloudflare tooling's own dependency requirements. |
| `minimatch` | Moderate | Transitive, development; TypeScript ESLint project globs | Affected `10.2.5` → `11.0.1`, scoped to typescript-estree; unaffected root `3.1.5` retained. |
| `next` | **Critical** | Direct, production; framework imports/compatibility | `16.3.4` → `16.4.5`. |
| `react-server-dom-webpack` | High | Direct, development classification; RSC pipeline | `19.2.6` → `19.2.9` together with React and React DOM. |
| `satori` | Moderate | Transitive, development; Vinext OG renderer | `0.16.0` → `0.33.5` through `@vercel/og`; fflate child patched separately. |
| `sharp` | High | Direct development and transitive production; image processing | `0.35.4` → `0.35.5`; existing Miniflare override updated consistently. |
| `source-map-js` | High | Transitive, production classification; source maps | `1.2.1` → `1.2.2`. |
| `typescript-eslint` | Moderate | Transitive, development; lint tooling | Remains `8.59.3`; vulnerable minimatch descendant patched. |
| `undici` | High | Transitive, development; Miniflare HTTP client | `7.24.8` → `7.30.1` through Cloudflare upgrades. |
| `vinext` | High | Direct, development classification; application framework/build/runtime integration | `1.0.0-beta.5` → stable `1.0.0`; its image-tooling chain is patched. |
| `vite` | High | Direct, development; dev server/build system | `8.0.14` → `8.3.6`. |
| `wrangler` | High | Direct, development; Cloudflare dev/deployment CLI | `4.92.0` → direct `4.157.0`; plugin also installs its compatible `4.156.1`. |
| `ws` | High | Transitive, development; Cloudflare WebSockets | `8.18.0` → parent-selected `8.21.0` / `8.22.0`. |
| `zod` | High | Direct, production; request/config validation | `3.25.76` → `4.6.7`; required record API adjustments at two call sites. |

## Other coordinated direct changes

| Package | Before | After | Reason |
| --- | --- | --- | --- |
| `react` / `react-dom` | `19.2.6` | `19.2.9` | Match the patched RSC peer requirements. |
| `@vitejs/plugin-rsc` | `0.5.26` | `0.5.39` | Satisfy stable Vinext's RSC plugin requirement. |
| `@cloudflare/workers-types` | `4.20260515.1` | `5.20261103.1` | Satisfy the upgraded Wrangler's Worker type peer requirement. |

Three `0.187.0`, React Three Fiber `9.8.2`, Drei `10.7.9`, TypeScript `5.9.3`, Drizzle ORM `0.45.2`, Vitest `5.0.5` and Playwright `1.64.1` remain unchanged. No auditorium, layout, camera, media provider, pricing, booking or checkout feature was redesigned.

The complete [lockfile version-change inventory](dependency-version-changes.csv) records all 236 changed, added or removed version entries, including platform-specific binaries and parent-selected transitive helpers. The lockfile itself was generated by npm.

## Overrides and compatibility evidence

1. **Existing:** `miniflare → sharp@0.35.5`. Updates the previous `0.35.4` override to the fixed patch. Direct sharp is pinned to the same version.
2. **New:** `satori → fflate@0.7.5`. The parent pins the vulnerable `0.7.4`; this uses the patched release within that minor. Binary compression round-trip regression coverage passes.
3. **New:** `@typescript-eslint/typescript-estree → minimatch@11.0.1`. The advisory affects versions 7 through 11.0.0, so a 10.x patch cannot resolve it. The installed parent uses the named `minimatch` function with `{dot:true}`. The override preserves that API, supports the current Node runtime, passes glob-behavior checks, and ESLint completes without a parser/dependency crash. Existing lint violations remain reported.
4. **New:** `@esbuild-kit/core-utils → esbuild@0.25.12`. Current stable Drizzle still includes the deprecated loader and its old esbuild pin. The installed loader uses `transform`, `transformSync` and `version`, not esbuild's HTTP server. This scoped pre-1.0 minor jump avoids changing unrelated esbuild consumers. Both transform paths execute successfully, and Drizzle generates the real project schema into an isolated `outputs/dependency-security/drizzle-smoke` directory. No generated SQL was applied to a database or written into the source migration directory.

The latter two overrides cross their parents' declared ranges, so they deserve review when those parents release compatible fixes. They are not claims of upstream certification. Keep the regression checks and re-audit before removing them. The esbuild-kit packages remain deprecated even though their installed child no longer has a reported advisory.

References: [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Zod migration guide](https://zod.dev/v4/changelog).

## Necessary application/build compatibility changes

- `app/api/[action]/route.ts`: retain snack-cart validation using Zod 4's explicit string key schema for `z.record`.
- `lib/blueprint-config.ts`: same explicit string key schema for auditorium seat maps. No IDs or layouts changed.
- `app/page.tsx`: explicitly request-render the homepage (`dynamic = "force-dynamic"`). The newer Vinext production Worker returned HTTP 500 when the formerly unclassified homepage's shared navigation read search parameters during static rendering. After this configuration fix, the rebuilt homepage returns HTTP 200. No page content or styling changed.
- `vite.config.ts`: stop registering the old Vinext-beta navigation patch.
- `scripts/vite/vinext-navigation.ts`: obsolete patch removed. Stable Vinext releases its navigation abort handle before handing the response stream to React. Injecting the beta patch would reference identifiers that no longer exist. Browser navigation regression results are recorded below.
- `tests/dependency-compat.test.ts`: add three focused checks for override behavior; no existing test was edited or removed.
- `package.json` and npm-generated `package-lock.json`: dependency changes above; existing security scripts preserved.
- This report records the audit and verification. Earlier uncommitted repository-cleanup changes are separate from these dependency changes.
- `README.md` links this report; `docs/CODEX_HANDOFF.md` records the updated React version and compatibility notes.

## Verification

| Check | Result |
| --- | --- |
| Normal install and clean `npm ci` | Passed. No peer bypass or force flag. |
| Full `npm audit --json` | **0 critical, 0 high, 0 moderate, 0 low**. |
| `npm ls --all --json` | No dependency-tree problems. |
| `npm run security:check` | Passed, no unreviewed findings; 48 ignore-rule probes. |
| `npm run security:test` | Passed, 9 tests. |
| `npm run typecheck` | Passed. |
| `npm test` | Passed, **24 files / 152 tests**, including 3 new compatibility checks. |
| `npm run build` | Passed; Cloudflare Worker/client output generated. |
| Drizzle schema-generation smoke check | Passed; isolated generated output only, no DB mutation. |
| Built Worker HTTP smoke test on local port 5174 | Homepage, Movies, Explore, Coming Soon, Cinemas, login, My Tickets and catalogue API all returned HTTP 200 after the homepage fix. |
| Built Worker browser smoke test | Homepage panorama hydrates, Movies navigation works and Coming Soon cards render; no uncaught script errors. |
| ESLint on changed TypeScript files | Passed with no warnings/errors. |
| Repository-wide `npm run lint` | **160 errors / 71 warnings**, matching the pre-existing saved lint baseline counts. No rules disabled. |
| Full Playwright suite | **117 passed, 16 failed, 1 existing skipped**; 134 tests, about 57 minutes, existing single-worker configuration. Not a green suite. |
| Isolated rerun of seven failures absent from saved baseline | **2 passed, 5 failed**; about 8 minutes. Original failures are retained in the full report. |

Install warnings remain for the deprecated esbuild-kit loader and npm's install-script approval inventory. No blanket script approval was added. Native tooling needed for the production build and transform checks executed successfully. Vinext's route-classification notice and bundler timing diagnostics do not represent a failed build.

The upgraded build also warns about future Vite native-config-loader requirements (JSON import attributes and an explicit local import extension), plus upstream RSC/Vinext sourcemap generation. These were recorded, not suppressed. The current build succeeds; a future Vite major/config-loader migration should address them deliberately.

An extra standalone Node ESM smoke check of `@vercel/og@1.0.3` failed with `Dynamic require of "fs" is not supported` inside its bundled HarfBuzz initialization. The latest registry release has the same version. This is an observed limitation of that Node entry, not a successful image-generation check. MovieVerse has no OG-image generation route/import, uses the Worker build rather than this standalone Node entry, and its production build succeeds. No workaround or vulnerable downgrade was introduced for an unused feature; revisit this limitation before adding runtime OG image generation.

Before this task, the saved full-browser baseline had **99 passed, 31 failed and 1 skipped**. Browser failures must be compared individually rather than assuming they were introduced by this dependency update. No green full-suite claim is made while failures remain.

### Browser verification details

Nine of the sixteen failed test names also failed in that saved baseline. Seven were not failures there; those seven were rerun separately. The saved baseline has 131 tests, while this run has 134: three existing `cleanup-regressions.spec.ts` checks were not included in the older saved run. They pass now. This comparison is useful evidence, not a controlled proof that dependencies caused every difference; data, network conditions and software rendering affect these tests.

| Test area | Full-run failure | Saved baseline also failed? | Isolated rerun / finding |
| --- | --- | --- | --- |
| `camera-boundaries.spec.ts` | A sampled camera position is reported obstructed. | Yes | Existing geometry assertion remains open; no camera changes made. |
| `large-screen.spec.ts` | Mobile projected bound is ~392.72px versus a 390px limit. | Yes | Existing framing assertion remains open; no geometry/CSS changes made. |
| `movie-showtimes.spec.ts` | City search input is not found after returning to Movies and immediately opening the city picker. | No | **Fails again.** Route/modal handoff needs investigation before claiming compatibility for that rapid interaction. |
| `movies-background.spec.ts` | Expected movie-card selector has no matching card. | Yes | Existing catalogue/selector expectation remains open. |
| `playback-engine.spec.ts` HLS | Extended buffering/replay/selection/Back sequence still finds a canvas after navigation. | No | **Fails again.** A separate simpler HLS play → Back probe reaches movie details with zero canvases, paused media and cleared source. That does not establish that the extended sequence is correct. |
| `playback-engine.spec.ts` YouTube | Playback telemetry does not reach playing within the assertion timeout. | No | **Passes** separately, including its mocked official-player lifecycle assertions. Full-run failure is not erased. |
| `seat-polish.spec.ts` touch | Expected selected-seat removal button is missing. | Yes | Existing touch/raycast expectation remains open. |
| `seat-workspace.spec.ts` 1920px | Test exceeds its 120-second timeout. | No | **Passes** separately with unchanged test/timeouts. |
| `theatre-performance.spec.ts` | Idle frame count is 5; assertion requires fewer than 5. | Yes | Existing software-rendering threshold remains open. |
| `ticket-design.spec.ts` navbar/search | Search dialog does not contain Sintel. | Yes | Existing catalogue/search expectation remains open. |
| `ticket-design.spec.ts` released-film search | Test timeout. | Yes | Existing search expectation remains open. |
| `ticket-experience.spec.ts` checkout | Test expects `glass-navbar`; actual class is `theatre-navbar`. | Yes | Existing style expectation remains open; navbar not redesigned. |
| `ticket-experience.spec.ts` mobile | Test clock cannot fast-forward to a time now in the past. | Yes | Existing timing harness issue remains open. |
| `tickets-background.spec.ts` cold 1440px | No recorded frame satisfies the test's non-`none` content-transform predicate. | No | **Fails again** at `checkStable`, line 34. Background-position assertions after that predicate are not reached. |
| Same cold test, 768px | Same content-animation sampling predicate. | No | **Fails again.** |
| Same cold test, 390px | Same content-animation sampling predicate. | No | **Fails again.** |

The cold-load failures do not by themselves demonstrate that the background moved: the failed assertion requires observation of an animated *content* transform. All three normal/hard-refresh background checks and the route-leak check pass. Nevertheless, the full cold scenario is not marked verified. No animation, CSS, or test predicate was changed to make it pass.

Successful local-browser checks include all five configured auditorium styles, Grand Balcony seat selection and seated-eye preview, native trailer time/presented-frame/GPU updates during camera movement, all three superseded-navigation/stream tests, hosted MP4 buffering/replay/cleanup, checkout coupon persistence/removal and server total agreement, reservation-preserving cancellation, the BOOKED stamp lifecycle, and Watchlist persistence/duplicate prevention/user isolation. Fixture-backed playback tests do not constitute a live YouTube or external payment-provider certification.

The city-picker handoff, extended HLS return sequence and cold-animation sampling need separate reproduction and targeted remediation. Changing global navigation state ownership, playback lifetime or CSS solely to satisfy these checks would exceed the evidence available for a safe dependency-only change. Until these are resolved, **do not treat the clean audit or passing build as approval that the entire application is regression-free or ready for public deployment**. Keep review/local verification on this branch; no publication was performed.

Private local evidence is retained under ignored `outputs/dependency-security/`, including original manifests/lockfile, before/after audit JSON, dependency trees, install/build/check logs and the complete lockfile change inventory. Browser traces can contain test-session cookies: keep them ignored and do not publish them.

## Remaining work and limits

No npm-reported dependency advisories remain at this audit snapshot. The browser verification gaps above, existing lint issues, licensed production cinema inventory, real payment-provider readiness and production configuration are separate concerns. These dependency fixes do not certify them or convert simulated bookings into real bookings. Re-run explicit `npm audit` periodically: the existing `.npmrc` disables automatic install-time audit output, not explicit auditing.

No secrets are reproduced here. Local environment credentials, Worker/D1 configuration, migration source, runtime assets, existing saved data, third-party notices and Git history are preserved. Browser verification uses the existing local test environment and may create synthetic test records through the normal application APIs.
