# Additive local hackathon fixtures

This opt-in operation adds the existing synthetic dataset to the ordinary local
`e_lingkod_bayan` database. It is separate from `demo:setup` and the portable
sanitized demo SQL. Never restore demo SQL over the ordinary database.

Copy `demo/hackathon.env.example` to ignored `.env.hackathon.local` and set local
credentials. Do not change the ordinary `.env`. Only the exact database name on
loopback is accepted. The existing development server need not be stopped.

From the repository in PowerShell:

```powershell
$recovery = '.scratch/features-5-6/artifacts/hackathon-import'
npm run hackathon:prepare -- --target=e_lingkod_bayan "--state-dir=$recovery"
npm run hackathon:import -- --target=e_lingkod_bayan "--state-dir=$recovery" --migrate-reviewed
npm run hackathon:verify -- --target=e_lingkod_bayan "--state-dir=$recovery"
```

Preparation makes a private, consistent full backup, restores it into a fresh
disposable database, verifies counts/data, rehearses the pinned prerequisite
migrations and checks original fields. Only then may `apply` deploy those
reviewed migrations and add fixtures. The temporary database is removed;
the private backup and journal remain. No ordinary reset/restore is provided.
Backup files contain actual local data and hashes: never stage or share them.
The prerequisites are the existing repository migrations, not new schema.
An unreviewed or edited migration fails closed; refresh its review deliberately.

Registration uses the existing validated authentication service and hashing.
Only newly registered fixture accounts receive local Admin/Staff provisioning.
Any existing email is a collision, even with matching demo credentials: its
password, role, profile and records are not used or replaced, and all dependent
fixture operations for that account are skipped. Relationships use the newly
registered IDs. Existing roster assignments and conflicting vacancy titles are
reported, never adopted or replaced. Every opportunity/review is visibly DEMO.
Roster fixture assignments are synthetic; they do not grant CENSUS authority.

Account scenarios/passwords are defined in `demo/fixtures/dataset.mjs` and
documented in `demo/accounts.csv`. IDs in that CSV belong to the dedicated demo
database; use the private import journal/report for the ordinary target mapping.
Never test a collided account with demo passwords. Actual sign-in, session and
sign-out verification covers only accounts created by this importer, with
bounded retries that respect existing rate limits. It can take several minutes.
No email or external recruitment publication is performed. Existing application
mutation services can add DEMO-labelled in-app audit/notification records.

Rerun `hackathon:import` with the same configuration/recovery directory for a
safe retry. Exact lifecycle payloads/request keys/versions are persisted before
execution; committed lifecycle mutations replay without extra records/history.
An unrelated or newer manual edit is a preservation conflict. Auth registration
and legacy vacancy APIs lack durable request receipts: if their result is lost
after commit, recovery stops for review rather than inferring ownership or
creating duplicates. Keep the journal/backup; do not delete it to bypass a conflict.
This conservative limitation is separate from the fully replayable lifecycle
operations. An advisory lock prevents concurrent imports on the local server.

`import-report.json` gives added accounts, collisions, held fixture operations
and exact operation counts; `credentials-verification.json` records actual login
results. `prerequisite-review.json` records backup recovery and migration checks.
Preserved original records are checked throughout. Fixtures remain distinct from
real respondents; analytics counts should not be presented as real coverage.

Run `npm run test:hackathon-import` to test collisions, interrupted operations,
later edits, retries and real credentials against disposable databases only.

`npm run hackathon:report -- --target=e_lingkod_bayan "--state-dir=$recovery"`
is read-only. It refreshes exact added-row/annual-status counts and writes
`managed-accounts.csv` with the ordinary target IDs, plus `fixture-counts.json`.
The original demo CSV IDs are deliberately preserved.

After migrations/client generation, an already running development process may
retain an older Prisma singleton. Restart that process yourself when convenient;
the importer does not stop it. The optional `tests/hackathon-journeys.js` smoke
uses a fresh loopback verification instance on localhost:3105 and exercises only
reads/sign-in/sign-out. It must never submit or edit application records.
