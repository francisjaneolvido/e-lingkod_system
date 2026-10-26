# Add shared synthetic data without replacing an existing database

This optional importer adds the repository's synthetic fixtures to a **local `e_lingkod_bayan`** database. It preserves existing accounts, passwords, roles and records. It does not merge a SQL export. Never restore `e_lingkod_bayan_demo.sql` over an existing ordinary database.

Complete the [root installation](../README.md) first. The 108 synthetic accounts represent 80 individual Citizens, 20 establishment representatives, four Admins and four Staff. Surveys, establishment histories, import observations and labelled DEMO vacancies are included. Fictional scenario data is not real residency, recruitment or employer verification. Final account totals depend on the existing database and collisions, not a fixed total of 111.

All commands below run in the repository root. Configuration examples, fixture definitions and importer code are supplied by Git. You create the ignored local config and private recovery directory. Installation needs no shared website credentials; Yesel supplies only `accounts.csv` for those website logins.

## 1. Configure an explicit local target

Use the MySQL host/account/password **you configured locally**. The preparation account needs access to the ordinary schema and permission to create/drop its temporary rehearsal database on the same local server. Stop the app, Studio and other writers during preparation and import so later writes do not invalidate the preservation snapshot. Keep them stopped until verification finishes.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if (Test-Path -LiteralPath '.env.hackathon.local') { throw 'Preserve and inspect the existing import config' }
    Copy-Item -LiteralPath 'demo/hackathon.env.example' -Destination '.env.hackathon.local' -ErrorAction Stop
    notepad .env.hackathon.local
}
```

In the editor, replace the placeholders, save and close it before continuing:

```dotenv
HACKATHON_DATABASE_URL=mysql://ENCODED_LOCAL_USER:ENCODED_LOCAL_PASSWORD@127.0.0.1:3306/e_lingkod_bayan
HACKATHON_AUTH_ORIGIN=http://localhost:3000
```

Encode the raw username/password as in the [root setup](../README.md#4-create-your-local-configuration); do not double-encode or reuse an example password. The importer has **no `DATABASE_URL` fallback**. It requires the exact ordinary database name on loopback and a localhost HTTP origin. It invokes authentication/mutations in process; a running Next server is not required. The application `.env` remains separate.

Choose one private, durable recovery directory for this target. This example uses your local application-data folder, outside the repository. Reuse the same value in every new shell and retry:

```powershell
$recovery = Join-Path $env:LOCALAPPDATA 'eLingkodBayan\import-state\ordinary-local'
```

Do not reuse another database's directory. Do not create a new directory to bypass an existing conflict or incomplete import.

## 2. Prepare the backup and migration rehearsal

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if ([string]::IsNullOrWhiteSpace($recovery)) { throw 'Set the durable recovery directory first' }
    npm.cmd run hackathon:prepare -- --target=e_lingkod_bayan "--state-dir=$recovery"
    if ($LASTEXITCODE -ne 0) { throw 'Preparation failed; preserve its files and do not import' }
    Get-Content -LiteralPath (Join-Path $recovery 'prerequisite-review.json') -ErrorAction Stop
}
```

Preparation reads ordinary data, takes a consistent full backup and snapshots its fields, restores into a newly generated disposable `elb_b3_test_…` schema, compares the restored data, rehearses eligible migrations there and checks original-field preservation. It removes the temporary clone; the private backup and proof remain. A successful process exit and `prerequisite-review.json` are required before proceeding. Keep every recovery file private: backups contain real local data and credential hashes.

### Migration support and stop conditions

Preparation accepts either **no pending migrations** or pending migrations whose exact SQL hashes are pinned in [prerequisites.mjs](../scripts/hackathon/prerequisites.mjs):

- `20261022234500_emergency_hotlines_alerts`
- `20261024010000_establishment_profiling`
- `20261024011500_restore_service_pickup`
- `20261024050000_pickup_confirmed_claimant`
- `20261024080000_census_records_imports`
- `20261024090000_spes_source_year`
- `20261024100000_census_ignored_provenance`

The proof records only the pending reviewed migrations actually rehearsed. Inspect `reviewedPendingMigrations`, `originalFieldsPreserved` and the target in that proof. Application requires the same proof, target, backup checksum and SQL hashes. Do not edit the proof or allowlist.

**Specific blocker for older schemas:** `20261024130000_opportunity_details` is outside this allowlist. Other nonlisted pending migrations also fail closed. The repository does not distribute a general backup/rehearsal runner for those updates. Stop and obtain a reviewed tooling change that rehearses the exact pending migration before ordinary deployment; do not run it on ordinary data merely to bypass preparation. This limitation does not block an already-current database or a fresh, fully migrated installation. See [existing-database updates](../docs/LOCAL-DEVELOPMENT.md#existing-database-updates).

## 3. Apply only after successful preparation

For an already-current schema (`reviewedPendingMigrations` is empty):

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if ([string]::IsNullOrWhiteSpace($recovery)) { throw 'Set the same recovery directory first' }
    npm.cmd run hackathon:import -- --target=e_lingkod_bayan "--state-dir=$recovery"
    if ($LASTEXITCODE -ne 0) { throw 'Import stopped; preserve state and inspect the conflict/error' }
}
```

If and only if the successful proof lists pending migrations, use this **alternative**, explicitly opting in to those pinned migrations:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if ([string]::IsNullOrWhiteSpace($recovery)) { throw 'Set the same recovery directory first' }
    npm.cmd run hackathon:import -- --target=e_lingkod_bayan "--state-dir=$recovery" --migrate-reviewed
    if ($LASTEXITCODE -ne 0) { throw 'Reviewed migration/import stopped; do not reset or discard its state' }
}
```

Do not run both alternatives as a normal sequence. Existing records are checked against the baseline. Registration uses normal profile validation/password hashing; privileged provisioning applies only to accounts newly created by this import. Related records use remapped IDs and application lifecycle services, preserving drafts, immutable revisions, consent and audits. Simulated reviews/listings remain visibly DEMO. The importer sends no external email or recruitment publication.

## 4. Verify and generate the local report

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if ([string]::IsNullOrWhiteSpace($recovery)) { throw 'Set the same recovery directory first' }
    npm.cmd run hackathon:verify -- --target=e_lingkod_bayan "--state-dir=$recovery"
    if ($LASTEXITCODE -ne 0) { throw 'Credential/preservation verification failed' }
    npm.cmd run hackathon:report -- --target=e_lingkod_bayan "--state-dir=$recovery"
    if ($LASTEXITCODE -ne 0) { throw 'Import report generation failed' }
    Get-Content -LiteralPath (Join-Path $recovery 'import-report.json') -ErrorAction Stop
}
```

Verification signs in, checks session/role and signs out through real authentication for **newly created accounts only**. Respect rate limits and bounded retries; allow several minutes. These checks create/remove temporary authentication sessions, not replacement passwords. Do not test collided accounts with fixture passwords.

Retain the whole directory, including:

| File | Purpose |
| --- | --- |
| `pre-import.sql`, `backup-manifest.json`, `pre-migration-baseline.json` | Private recovery backup/checksum and pre-existing-record preservation baseline. |
| `prerequisite-review.json` | Target-bound restored-backup/migration rehearsal proof. |
| `journal.json` and other operation state | Durable request identities, prepared payloads, versions and completion checkpoints. |
| `import-report.json` | Actual added accounts, collisions/held operations and operation counts. |
| `credentials-verification.json` | Actual sign-in results for import-owned accounts. |
| `fixture-counts.json`, `managed-accounts.csv` | Refreshed persisted scenario counts and ordinary-target IDs/credentials. Keep private. |

`hackathon:report` reads application data and writes local reports; it does not reimport fixtures. IDs in repository [accounts.csv](accounts.csv) belong to the dedicated demo: use your local report for remapped ordinary IDs. After schema/client changes, regenerate with `npm.cmd run db:generate`, check success and restart the app using the root guide. Check actual Citizen/Staff/Admin access.

## Retries, collisions and interruptions

- An existing email is a **collision**, even if its name or password looks like a fixture. Its password, role, profile and records remain untouched; dependent fixture operations are skipped. The final account total can therefore be less than 108 additions.
- Existing conflicting roster assignments or vacancies are reported, not adopted. Later manual edits cause preservation conflicts; do not erase them to force a green result.
- For an interrupted operation, retain the same config, target and directory. Rerun the **failed phase** after reading its diagnostics. Prepared idempotent lifecycle mutations replay their original payload/request key/versions, so a committed response-loss retry does not add another revision.
- Registration and legacy vacancy operations do not all have durable server receipts. An ambiguous result fails closed for investigation; retry safety is not permission to invent a new identity, reset a password or delete a checkpoint. Do not infer that a matching record is importer-owned.
- Do not edit fixture definitions, proofs, journal or backups midway through recovery. Preserve the entire state for diagnosis; do not upload it because it contains private ordinary data.
- A completed import must not be reinitialized. Use its existing verification/report phase as needed, without adopting newer manual data as fixture completion.

Maintained regression command: `npm.cmd run test:hackathon-import`. It uses disposable databases to exercise collisions, recovery and credentials; it is not the ordinary importer. Running a command is not evidence of success until its result is checked.
