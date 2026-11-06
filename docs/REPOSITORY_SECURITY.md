# Repository security and safe setup

These instructions protect source publication and local development data. They do not enable live cinema inventory or production payments.

## Local environment

1. Install the dependencies using the existing lockfile and README instructions.
2. Inspect `.env.example` for variable names and safe defaults. It is documentation, not a place to store credentials.
3. If `.dev.vars` already exists, preserve it. Do not overwrite it by copying an example file. For a new checkout, create `.dev.vars` privately in an editor.
4. Configure either `TMDB_READ_TOKEN` (preferred) or `TMDB_API_KEY` there. Never use a browser-exposed `VITE_*` or `NEXT_PUBLIC_*` name for a secret.
5. Add `ADMIN_TOKEN` privately only if administrator publishing is needed. Leave licensed-provider settings disabled unless access, coverage and approval are genuinely established.
6. Restart the local server after changing runtime secrets. Keep one browser origin, such as `http://127.0.0.1:5173`, throughout a booking journey.

The backend accesses D1 through its `DB` binding, not a public database URL. `.openai/hosting.json` contains binding/project metadata; `deployment.public.json` contains public resource configuration. Neither substitutes for a provider credential. Production Worker secrets and production D1 state are separate from local `.dev.vars` and `.wrangler/state`.

Apply `npm run db:local` to the intended local database using the documented migration baseline. Do not delete `.wrangler` or replay initial migrations blindly against an existing installation. It can contain accounts, password derivation data, sessions, holds and booking history.

## Before staging or sharing

```powershell
npm run security:test
npm run security:check
npm run security:history
git status --short
git diff --check
```

`security:check` runs both source secret scanning and repository hygiene checks. It includes tracked files and untracked files that Git does not ignore. A tracked file is still checked even if a later ignore rule matches its path. `security:history` reads text blobs reachable from all local refs without changing commits or refs; it needs full history for complete local coverage.

Optional staged-content checks:

```powershell
node scripts/check-secrets.mjs --staged
node scripts/check-repository-hygiene.mjs --staged
```

Staged mode reads the index for secret content. Ignore-rule probes use the current working-tree `.gitignore`; stage its intended final version and run the full checks as well. No Git hooks are installed automatically.

Exit status is 0 for a completed clean scan, 1 for findings, and 2 if the check cannot complete. Results contain paths, locations, rules and object IDs, not matched secret values. A local secret file is read privately only to detect accidental copies of configured credentials into publishable source.

## What the checks cover

- Common provider-token formats, JWTs, private-key markers, session cookies, credential-bearing URLs and credential-like literal assignments.
- Exact matches against configured local secret values in files being scanned.
- Private/generated paths accidentally tracked or left unignored, including environment files, keys, certificates, SQLite databases, common dump formats, archives, browser auth state and network traces.
- 48 ignore-rule probes, with checks that public examples, schema source and migrations remain visible.

`scripts/security/secret-allowlist.json` contains 14 exact path/rule/fingerprint exceptions for reviewed synthetic test credentials. It does not include their values. High-confidence provider-token patterns remain checked, and a value matching an actual local credential is never exempted. New exceptions require manual review; do not broadly exclude tests or a whole source directory.

The checks use Node built-ins and Git; no additional application dependency or scanner account is required. The GitHub workflow uses commit-pinned official checkout/setup actions, read-only repository permissions, no persisted checkout credentials, and no application secrets. It will run after an approved push; it has not been executed remotely merely by adding the file locally.

## Limits and dependencies

Pattern scanning can miss encoded, encrypted or unfamiliar credentials and cannot establish whether a string is active. Binary artwork/video/PDF/archive contents, ignored private files and external storage are not comprehensively inspected by the repeatable text scanner. The approved one-time audit separately inspected the deployment archives and browser-trace contents before cleanup.

Do not upload a complete project-folder archive as a substitute for Git: ignored files would still be included unless the archive is explicitly filtered. Playwright traces/HARs may contain cookies, personal data and request bodies. Sanitize any evidence before sharing it.

This does not replace dependency advisory checks or a runtime penetration test. `.npmrc` currently suppresses automatic install-time audit output; run an explicit `npm audit` when reviewing dependency advisories. Review fixes before upgrading; do not use a force upgrade just to obtain a clean report.

## Generated files and local preservation

The approved cleanup removed only the 46 identified cookie-bearing traces and five obsolete generated deployment archives. The complete manifest and verification are in [the cleanup report](REPOSITORY_SECURITY_CLEANUP.md). Existing `.dev.vars`, local D1 state, application code, migrations, runtime assets, and third-party notices were preserved.

The security commands are read-only. They do not delete files, rotate credentials, rewrite Git history, or push changes. If a finding is a real exposed credential, rotate it with its provider and assess previous copies before deciding on any separately authorized history cleanup.

## Optional legacy asset tool

`scripts/prepare-assets.mjs` is an optional historical asset-preparation tool, not a startup/build requirement. It writes runtime assets and reference mockups when deliberately invoked. Review it before use; it is not part of security cleanup.

```powershell
node scripts/prepare-assets.mjs "path/to/reference-images"
```

Alternatively set `MOVIEVERSE_ASSET_SOURCE` to the source directory. The script now validates that a directory was supplied before creating output. Do not run it merely to start the website; existing committed assets are already available.

## Rights and third-party material

No MIT or other open-source license is granted for MovieVerse application code. Public repository visibility does not grant reuse, modification or redistribution permission. Existing dependency/vendor licenses and third-party asset terms apply only to their respective material. Keep their notices intact; see [asset credits](ASSET_CREDITS.md).
