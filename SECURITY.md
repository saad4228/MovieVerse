# Security policy

MovieVerse is a portfolio demonstration. Its cinema inventory, payments and admission tickets are simulations. No claim of production payment processing or live cinema booking is made.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/saad4228/MovieVerse/security/advisories/new) if it is enabled for this repository. If that page is unavailable, contact the repository owner through a private channel already available to you. This repository does not publish a dedicated security email address, and response times are not guaranteed.

Do not open a public issue containing credentials, cookies, database contents, personal information, or an exploit against a third-party system. A report should describe the affected revision, feature, impact, and minimal reproduction using a disposable local test account. Redact sensitive request headers and values.

Test only environments you own or are explicitly authorized to assess. Do not test TMDB, cinema operators, payment services, or hosting infrastructure without their authorization.

## Keep private

- `.dev.vars`, non-example `.env` files, private keys and certificates.
- Local D1 databases, journals and backups under `.wrangler/` or elsewhere.
- Session cookies, browser authentication state, HAR captures and Playwright traces. A trace can contain request headers even when screenshots look harmless.
- Provider secrets, administrator tokens and unsanitized operational logs.

If a real credential is exposed, revoke/rotate it with its provider first. Removing it from the latest file does not remove previous commits, releases, shared traces or other copies. Any Git-history repair requires an explicit, separately approved plan.

## Repository checks

Run `npm run security:check` before staging or sharing changes. It checks current tracked/untracked nonignored files for secret patterns and accidental private/generated paths. `npm run security:history` also scans locally reachable historical text blobs. Findings print paths, locations and rule names, never matched values.

These dependency-free checks are heuristics, not a full security assessment. They do not certify runtime security, inspect every binary for embedded information, or replace a dependency-advisory review. Existing test-only exceptions are narrowly fingerprinted; do not add exceptions for real credentials.

See [repository security and safe setup](docs/REPOSITORY_SECURITY.md) for commands, limitations and handling generated files.

## Rights and third-party notices

This policy grants no license to use, modify or redistribute MovieVerse. No open-source license is added to the application. Existing third-party license notices and asset terms remain applicable to their respective material; see [asset credits](docs/ASSET_CREDITS.md).
