# Existing installations: migration review and additive sample data

This path preserves existing accounts, passwords, roles and records. It is different from the [fresh installation](../README.md#install-on-windows). Never restore a full demo SQL export over existing data, run reset/db push, or clear/seed an ordinary database to reach an expected total. Backups contain private data and must stay outside Git and review packages.

## 1. Inspect and stop writers

Preserve `.env` and your existing authentication secret. Obtain the reviewed source, stop known application/Studio/import writers, then install locked dependencies and generate the client:

```powershell
npm.cmd ci
npm.cmd run db:generate
node node_modules/prisma/build/index.js migrate status
```

Read every exit code/output. Pending migrations make status nonzero; failed/unfinished history needs investigation. Do not fabricate migration entries. If there are no pending migrations, skip the next section and proceed to additive data only if you actually want it.

## 2. Back up and rehearse pending migrations

Create a private ignored `.env.maintenance.local` with an explicit `DATABASE_URL` for the database being upgraded and `MYSQL_RSA_PUBLIC_KEY_PATH` for that server. Use your own local maintenance account with source read access and permission to create/drop a temporary rehearsal schema. Do not replace the application's runtime credentials. URL-encode each credential as in [Windows setup](../docs/WINDOWS-SETUP.md#3-create-private-configuration).

```powershell
$migrationRecovery = Join-Path $env:LOCALAPPDATA ('eLingkodBayan\recovery\migration-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
node scripts/rehearse-local-migrations.mjs --config=.env.maintenance.local "--state-dir=$migrationRecovery" --expect-database=e_lingkod_bayan
if ($LASTEXITCODE -ne 0) { throw 'Rehearsal failed; preserve the private state and stop.' }
Get-Content -LiteralPath (Join-Path $migrationRecovery 'migration-rehearsal.json')
```

For an existing dedicated demo database use `--expect-database=e_lingkod_bayan_demo`. This separate tool pins all current migration contents against `prisma/migrations/review-manifest.json`, verifies existing history, takes a consistent private backup, restores it to a newly owned clone, compares all restored fields, rehearses `migrate deploy`, verifies original fields and checks that the source did not change. Only the owned clone receives DDL and is removed afterward. Source views, triggers, routines, events, cross-database foreign keys or unknown/edited/unfinished migrations fail closed rather than pretending a partial backup is complete.

Review the proof and exact pending SQL before deployment. The tool does **not** authorize or perform source deployment. Ensure the application's `.env` points to that same reviewed database, then the installation owner can run:

```powershell
npm.cmd run db:migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; keep the application stopped and inspect history/diagnostics. Do not retry DDL blindly.' }
npm.cmd run db:generate
node node_modules/prisma/build/index.js migrate status
```

For a managed dedicated `e_lingkod_bayan_demo` installation, use `npm.cmd run demo:setup -- --migrate-only` instead of the first command above so its readiness metadata is updated with the reviewed schema. This mode preserves fixtures and credentials; it does not reload sample data. Keep the same private demo configuration and inspect its exit code.

Do not automatically restore over a failed source database. Retain backup, proof and logs for deliberate recovery. An unchanged database needs no repeated activation. The existing importer below retains its original narrower migration allowlist; complete the separate reviewed schema upgrade first instead of widening that allowlist.

## 3. Add the supported synthetic records

This optional importer targets an existing local `e_lingkod_bayan` only. A fresh dedicated demo uses `demo:setup` instead. The importer preserves collisions: an existing email retains its own password/role and is not silently adopted. Totals therefore depend on the existing data. The distributed fixture defines 108 accounts, not an ordinary-database total of 111.

Create `.env.import.local` from [import.env.example](import.env.example), without overwriting an existing file. Supply your local maintenance connection, the private catalogue from Yesel and the same local auth origin as the app. The application `.env` supplies its existing auth secret. No fixture password is embedded in source. Keep the app stopped.

```powershell
$importRecovery = Join-Path $env:LOCALAPPDATA ('eLingkodBayan\recovery\import-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
npm.cmd run demo:import:prepare -- --config=.env.import.local "--state-dir=$importRecovery" --target=e_lingkod_bayan
if ($LASTEXITCODE -ne 0) { throw 'Backup/restoration preparation failed; do not import.' }
npm.cmd run demo:import:apply -- --config=.env.import.local "--state-dir=$importRecovery" --target=e_lingkod_bayan
if ($LASTEXITCODE -ne 0) { throw 'Import stopped; retain the same state directory.' }
npm.cmd run demo:import:verify -- --config=.env.import.local "--state-dir=$importRecovery" --target=e_lingkod_bayan
if ($LASTEXITCODE -ne 0) { throw 'Preservation/credential verification failed.' }
```

Preparation makes and restores a private backup and compares fields. Apply uses an operation journal and application lifecycle functions, remaps newly created IDs, retains histories/consent, and verifies original records after changes. Only newly owned, exact reserved-domain fixture identities receive explicit synthetic LEGACY classification; they are not described as ID-verified. Public registration and document review remain unchanged.

New accounts authenticate with the supplied catalogue. Existing collided accounts must use their original credentials, not the fixture password. An import cannot continue privileged fixture operations if every fixture Admin collides and none is newly owned; it fails without taking over existing accounts. Review that conflict with the installation owner rather than resetting passwords.

## Retries and recovery

Retain and reuse the **same** recovery directory for an interrupted import. A completed operation is not repeated. Ambiguous commits, manual edits and changed fixture definitions stop for review; do not delete journals or create a new state directory to bypass them. A successful import is not a daily startup command. Sign-in verification may create/remove temporary sessions, but does not replace passwords.

Use `demo:import:report` with the same arguments for a local summary; reports and backups remain private. The internal `scripts/hackathon` directory and older command aliases remain for compatibility; they do not describe the product or authorize unreviewed migrations. Full export/restore is a separate operation for empty dedicated demo targets only, never an additive merge.
