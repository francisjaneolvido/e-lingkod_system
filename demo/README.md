# Isolated synthetic demo

Use this optional environment to explore persisted records without replacing an ordinary database. Dataset `elb-demo-2026-v1` uses reference year **2026** and includes 108 synthetic accounts, surveys, establishment histories, source observations and 28 labelled DEMO vacancies. These are fictional scenarios, not real citizens, recruitment or employer verification.

For an additive import into an existing ordinary database, use the [separate importer guide](HACKATHON-IMPORT.md). A full SQL restore is **not** a merge.

## Setup from the repository root

First install Node/MySQL and dependencies using the [root guide](../README.md). Keep the ordinary `.env` unchanged. These demo examples run in Windows PowerShell 5.1 or 7.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if (Test-Path -LiteralPath '.env.demo.local') { throw 'Preserve and inspect the existing demo configuration' }
    Copy-Item -LiteralPath 'demo/demo.env.example' -Destination '.env.demo.local' -ErrorAction Stop
    notepad .env.demo.local
}
```

The example is supplied by Git; `.env.demo.local` is created by you and ignored. In the editor, set the explicit URLs using your **local MySQL** credentials and encode username/password as in the root guide:

```dotenv
DEMO_DATABASE_URL=mysql://ENCODED_LOCAL_USER:ENCODED_LOCAL_PASSWORD@127.0.0.1:3306/e_lingkod_bayan_demo
DEMO_RESTORE_DATABASE_URL=mysql://ENCODED_LOCAL_USER:ENCODED_LOCAL_PASSWORD@127.0.0.1:3306/e_lingkod_bayan_demo_restore
DEMO_AUTH_SECRET=YOUR_NEW_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
DEMO_BASE_URL=http://localhost:3102
```

Generate a fresh random secret with this compatible PowerShell block and copy its output into `DEMO_AUTH_SECRET`, then save/close the editor:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    [Convert]::ToBase64String($bytes)
}
```

The MySQL account needs create/migrate/read/write access to the dedicated databases; verification tools also create/drop their own temporary clones. Demo commands have **no ordinary `DATABASE_URL` fallback**. Primary name must be exactly `e_lingkod_bayan_demo`; restore name must be `e_lingkod_bayan_demo_restore` or that name plus `_` and a lowercase-alphanumeric suffix. Do not change target guards.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd run demo:setup
    if ($LASTEXITCODE -ne 0) { throw 'Demo setup stopped; preserve its checkpoint and records' }
    npm.cmd run demo:verify
    if ($LASTEXITCODE -ne 0) { throw 'Demo verification failed' }
}
```

Setup creates/migrates the dedicated database, registers real accounts using validation/password hashing, provisions privileges and calls application mutations. It checkpoints exact prepared operations. A completed repeat verifies its fingerprint without resetting records. Manual edits, unexpected migrated data or changed fixture content cause a conflict; preserve them instead of deleting state or silently resetting passwords. `demo:setup -- --migrate-only` applies additive demo migrations without replacing fixture data; manual changes can still prevent later fixture/export verification.

Start a separate server and leave this terminal running:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd run demo:dev
    if ($LASTEXITCODE -ne 0) { throw 'Demo server stopped with an error' }
}
```

Open **http://localhost:3102/login**. The server binds to loopback, uses separate `.next-demo` output and displays **DEMO — synthetic data only**. Use `localhost`, matching its auth origin. Ctrl+C stops this app, not MySQL. Normal app installation/startup does not automatically seed demos.

## Accounts and journeys

Website credentials are in the synthetic [accounts.csv](accounts.csv); Yesel's supplied `accounts.csv` is also for website logins only. Neither supplies your local database credentials. All accounts retain unverified email status. Establishment representatives are Citizens, not an Employer role or verified legal owners.

| Account | Suggested journey |
| --- | --- |
| `individual.02@example.test` | `/community-survey` and `/opportunities`: submitted profile and optional matching. |
| `individual.61@example.test` | Later draft over a retained submission; matching consent off. |
| `individual.69@example.test` | Incomplete draft without a current submission. |
| `individual.75@example.test` | Withdrawn participation and protected history. |
| `establishment.03@example.test` | `/establishment-survey`: corrected identity with earlier snapshots. |
| `establishment.18@example.test` | Draft-only organization. |
| `admin.01@example.test` | `/admin/census`, imports, reviews, rosters and `/admin/jobs`. |
| `staff.01@example.test` | CENSUS across all barangays and JOBS. |
| `staff.02@example.test` | CENSUS limited to Bambang. |
| `staff.03@example.test` | JOBS only; census access denied. |
| `staff.04@example.test` | Projects only; synthetic roster membership grants no CENSUS permission. |

Default Citizen login returns to `/`; `/login?next=/community-survey` requests a direct journey. Admin/Staff access remains permission checked. Public census analytics is deferred.

## Persisted populations and expectations

[expected-counts.json](expected-counts.json) is the maintained scenario reference; [fixtures](fixtures/dataset.mjs), [source-import fixtures](b3-fixtures.mjs) and [opportunity fixtures](b5-fixtures.mjs) define their provenance. Do not hard-code these totals into application charts.

- 80 individual Citizens: 68 current submitted respondents, eight historical 2025 submissions, six withdrawals and 14 working drafts (eight over existing submissions).
- 20 establishment representatives: 17 current submitted establishments, one draft-only organization, two withdrawals and five historical annual submissions. Known organizational workforce totals sum to 370; four totals remain unknown. These are not extra individual respondents.
- Thirteen imported observations: eight accepted, one skipped, one rejected and three held for review. Six legacy observations have unknown survey year; source observations are not additional unique people. Rejected/held/skipped rows are excluded from accepted analytics.
- 28 DEMO vacancies: 16 published, two drafts, four pending review, two returned, two closed and two filled. Pay/requirements are explicitly synthetic. Genuine vacancy rankings exclude demonstrations; matching consent does not guarantee a suitable suggestion.
- Synthetic assistance roster: Bambang has two designated Staff, Batong Malake is confirmed empty, Maahas has one; other barangays are not configured. This is not real-time availability or municipal staffing data.

Drafts never replace eligible retained submissions in statistics; revisions do not add people. Current optional consent gates personalized results and notices. The explicit **Check opportunities** action creates deduplicated in-app notices, with current refusal/withdrawal/unavailable listings suppressing stale actions. No profiles/applications or external messages are sent.

## Export and restore into a separate fresh database

The repository supplies `e_lingkod_bayan_demo.sql` and [export-manifest.json](export-manifest.json). To regenerate an export from your dedicated primary demo and verify a separate restore:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd run demo:export
    if ($LASTEXITCODE -ne 0) { throw 'Demo export failed' }
    npm.cmd run demo:restore
    if ($LASTEXITCODE -ne 0) { throw 'Fresh dedicated restore failed' }
    npm.cmd run demo:verify -- --restored
    if ($LASTEXITCODE -ne 0) { throw 'Restored credential/count verification failed' }
}
```

For a repository-distributed export, `demo:restore` then `demo:verify -- --restored` can be run without creating/exporting a primary database first; both still require the explicit local config. Start the restored instance with `npm.cmd run demo:dev -- --restored`, checking its exit code when it stops. Do not run both demo servers on port 3102 simultaneously.

Export includes compatible migration history, password hashes and synthetic feature/audit records, but excludes sessions, reset/verification links, active invitations, bearer tokens, grants and connection secrets. It reads only the dedicated database and refuses fingerprint conflicts. Restore checks the declared checksum/data fingerprint and a fresh allowed target. An identical completed restore is a no-op; a conflicting nonempty database is preserved and rejected. Use a new allowed restore suffix if another fresh copy is required. Only exact declared content or equivalent LF/CRLF transport is accepted; altered content is rejected.

## Verification and recovery

`demo:verify` checks counts/scenarios and all 108 sign-ins through the real auth handler with normal rate limits, session/role checks and sign-out. Allow several minutes; bounded Retry-After handling is intentional. `demo:verify -- --counts-only` explicitly skips credentials. A generated SQL file or counts-only result does not prove portability: restore and repeat full verification.

Prepared lifecycle operations replay exact request keys/payloads/versions after committed response loss. Later manual edits are not adopted. Operations without native durable receipts fail closed on an ambiguous outcome; retain the reported checkpoint and resolve the conflict deliberately. Do not reset a database to make fixture verification pass.

Maintained isolated commands: `npm.cmd run test:demo:transfer`, `npm.cmd run test:demo:upgrade`, `npm.cmd run test:census`, `npm.cmd run test:analytics` and `npm.cmd run test:opportunities`. Browser runners append `:browser` to the latter three script names and use a generated disposable database on localhost:3103. They leave the primary demo available. Use the [local troubleshooting guide](../docs/LOCAL-DEVELOPMENT.md#troubleshooting) for ports, credentials, environment overrides and stale clients.
