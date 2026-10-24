# Shared eLingkod Bayan demo

Dataset `elb-demo-2026-v1`, reference year **2026**. These are synthetic local fixtures, not real citizens, employers, recruitment or municipal verification. `accounts.csv` intentionally contains shared demo passwords. Never reuse these credentials elsewhere or enter real personal data.

The ordinary application database is separate. Demo commands require an explicit **local** MySQL connection targeting `e_lingkod_bayan_demo`. They never use the ordinary `DATABASE_URL` as a fallback. The persistent demo remains available after verification. Application code, migrations and Prisma client must match this branch.

## Windows / PowerShell setup

Use the repository's supported Node version, local MySQL, and install the lockfile dependencies. From the repository root:

```powershell
npm ci
Copy-Item demo/demo.env.example .env.demo.local
notepad .env.demo.local
```

If `.env.demo.local` already exists, preserve it and edit it directly; do not overwrite it with the example. Enter your local MySQL username/password in both explicit demo URLs (URL-encode special characters). Set `DEMO_AUTH_SECRET` to a new random value of at least 32 characters. Primary database name must be exactly `e_lingkod_bayan_demo`; restore name must be `e_lingkod_bayan_demo_restore` or that name plus `_` and lowercase alphanumeric suffix. Use `http://localhost:3102` as base URL. Keep this file untracked; `.env*` is already ignored. Do not edit the ordinary `.env`.

```powershell
npm run demo:setup
npm run demo:verify
npm run demo:dev
```

Setup creates/migrates **only the primary demo database**, registers accounts through the existing validation/hashing service, provisions access through privileged mechanisms and invokes existing mutation contracts. It takes checkpoints and resumes interrupted fixture operations. Repeating completed setup verifies its fingerprint and makes no changes. It never silently resets passwords or replaces manual edits. Changed fixture definitions or database records produce a conflict; preserve those edits and resolve them deliberately. Do not edit demo records while setup/export/restore verification runs. No demo seeding runs during installation, normal startup or production migrations.

`demo:dev` runs on **port 3102** with separate `.next-demo` output, leaving the ordinary development server alone. The page shell displays **DEMO — synthetic data only**. Stop this server with Ctrl+C before starting another demo server. All normal record lists and charts still query persisted application records. Use `localhost`, matching the configured auth origin; do not substitute another hostname.

## Accounts and sample journeys

Open `http://localhost:3102/login`. Exact passwords and linked record IDs are in [accounts.csv](accounts.csv).

| Account | Journey |
| --- | --- |
| `individual.02@example.test` | Current submission with matching consent; profile and opportunity suggestions |
| `individual.61@example.test` | Working draft over protected submitted/history records; matching consent off |
| `individual.69@example.test` | Incomplete draft, no completed current survey |
| `individual.71@example.test` | Current draft plus historical submission; historical matching uses current consent |
| `individual.75@example.test` | Withdrawn participation, protected history, optional consent revoked |
| `establishment.03@example.test` | Explicit identity correction with immutable earlier snapshots |
| `establishment.15@example.test` | Later organizational draft over submitted record |
| `establishment.18@example.test` | Draft-only organization |
| `establishment.19@example.test` | Withdrawn organization |
| `admin.01@example.test` | Existing administrator workspace and module permissions |
| `staff.01@example.test` | PESO, CENSUS (all barangay record scopes), Community Data + Jobs |
| `staff.02@example.test` | MSWDO, CENSUS (Bambang record scope) + Community Data |
| `staff.03@example.test` | PESO, Jobs only |
| `staff.04@example.test` | Municipal Engineering Office, Projects only |

There are **108 accounts**: 80 individual citizens, 20 establishment representative citizens, four Admins and four Staff. Establishment representatives use ordinary Citizen accounts; this does not prove legal ownership. Email verification remains false for every account.

There are **68 current submitted individual respondents**, eight historical 2025 submissions, six withdrawals and 14 working drafts (including eight later drafts). Current matching consent permits 51 current submissions; existing latest-submitted-year matching also permits one historical profile, for **52** eligible profiles overall. See [expected-counts.json](expected-counts.json) for exact consent/category/year/source totals. Unknown values remain null.

Twenty establishments have 17 current submitted records, one draft-only record, two withdrawals and five historical annual submissions. Known worker totals across current submitted organizations sum to **370**, with four unknown totals. Organizational headcounts are never individual survey respondents. Six imported activity records have unknown overlap with citizen surveys; they are not six additional unique people. The review-only import sample contains duplicate references, uncertain overlap and an empty rejected row; it is never automatically imported.

The 28 `[DEMO]` opportunities include 16 published, two drafts, four pending review, two returned, two closed and two filled. Review notes/source explicitly say simulations; verification booleans reflect the existing demo workflow and are **not genuine employer verification**. No external publishing occurs. Photography-only and mismatched work/education/location combinations offer low/no skill-overlap cases; refusal/draft-only cases have no eligible personal matching profile.

The frozen base fixture annotations remain historical. The additive `b5-fixtures.mjs` scenarios now persist compensation/currency/basis/negotiability, occupational and employment-sector categories, arrangement, experience and certification requirements on the same 28 managed vacancy IDs through normal versioned mutations. Public workforce/employer-demand analytics remain unavailable; protected statistics use current CENSUS scope. No ordinary database import or migration is run by demo commands.

## Export and portable restore

```powershell
npm run demo:export
npm run demo:restore
npm run demo:verify -- --restored
npm run demo:dev -- --restored
```

Export reads exclusively from the primary dedicated demo database after its managed-data fingerprint matches. It writes sanitized schema, compatible `_prisma_migrations`, password hashes and feature/audit records to `e_lingkod_bayan_demo.sql`, with a checksum/table inventory in `export-manifest.json`. Sessions, verification/password-reset records and staff invitations have **zero exported rows**; external-account bearer tokens are null. Connection credentials/auth secrets and database grants are excluded. Restore through the maintained command, not into the ordinary database with a generic SQL client.

Restore creates a **fresh** configured restore database and checks its target, SQL checksum and restored data fingerprint. An identical already-restored database is a no-op; conflicting/nonempty databases are preserved and rejected. For another fresh restore, select a new allowed restore suffix in the explicit config rather than deleting existing data. Then rerun all credential/count checks. Keep primary demo data available for the team.

`demo:verify` uses the **real Better Auth HTTP request handler** for all 108 sign-ins, gets the real session/role and signs out. It preserves installed rate limits, spaces requests and handles bounded Retry-After waits. Expect several minutes; do not remove throttling or alter global auth settings. A missing-IP warning is expected for the in-process handler: all requests share one limiter bucket; no spoofed IPs are used. Browser checks additionally exercise actual pages. `--counts-only` explicitly skips sign-ins and must not be reported as a full credential check.

```powershell
node --test tests/demo-environment.test.mjs
node scripts/demo/check-transfer.mjs
```

The transfer regression restores a separately named disposable demo clone, proves no-op restore and preservation/rejection of manual edits, and removes only its freshly generated clone. Primary and configured restored demo databases remain. Check private B3 REVIEW for executed results; commands documented here alone are not verification evidence.


## B3 protected records, roster and recovery

The active milestone is B3 Census Records and Imports. Open `/admin/census` after Admin login or with explicit CENSUS permission and an Admin-assigned record scope. `/admin/census/imports` offers CSV/XLSX mapping, source/year/reference validation, complete batch/row outcomes and source history. Assessment/verification is restricted to scoped CENSUS Staff; only Admin approval. Reviews target immutable revisions; prior approval never approves later edits. All displayed review/roster times explicitly use Philippine time.

The default login journey is `/login` → `/` for a Citizen. It is browser-tested. A direct profile journey is `/login?next=/community-survey`; an Admin census journey is `/login?next=/admin/census`. Demo startup explicitly binds Next to hostname `localhost`; the tested listener was IPv6 loopback `::1`, not a wildcard interface. Auth origin remains `http://localhost:3102`.

B3 adds seven synthetic source rows from `demo/b3-fixtures.mjs` to the six preserved earlier activity rows. Outcomes are eight ACCEPTED, one SKIPPED, one REJECTED and three REVIEW_NEEDED; thirteen total source observations, not thirteen unique people. The earlier six rows keep unknown legacy source/year metadata rather than being assigned fabricated provenance. The new batch records source/year/reference identity: A duplicate skips, B identical answers remain a separate reference, C conflicting versions are both held, D invalid age rejects, missing reference stays unknown/review-needed. See expected-counts.json for exact source/year/outcome groups.

Synthetic Designated survey-assistance staff assignments: Bambang has Staff 01 and 02 (count2); Batong Malake is explicitly confirmed empty (zero); Maahas has Staff04 (count1); other barangays are Not configured. These are demonstrations, not municipal staffing or availability claims. Staff04 retains Projects permission and receives no CENSUS grant from roster membership. Staff01/02 CENSUS grants and scopes were added independently through existing privileged mechanisms. If designated accounts cease to be active Staff, the roster asks for reconfirmation; it does not present an unconfirmed zero. Admin roster/scope changes preserve actor/time audit.

`demo:setup` applies additive pending migrations to the dedicated database and proves original row/column values survived. `npm run demo:setup -- --migrate-only` applies only migrations. Existing manual edits are preserved; after migration they still cause an explicit fixture/export baseline conflict. No passwords/records are reset, and newer edits are never silently adopted as fixture completion. A demo-only checkpoint stores complete prepared lifecycle payloads, request keys and original versions before execution. Committed submissions/establishment operations replay exactly from authoritative receipts; later unrelated edits produce a conflict and remain intact. Transient authentication cookies/tokens are regenerated, never journaled. Ambiguous unfinished B1 draft writes have no native receipt: recovery fails closed instead of inferring ownership from identical answers; resolve that reported conflict deliberately. Legacy unprepared pending checkpoints also fail closed.

Maintained verification commands (all database writes use protected disposable targets):

```powershell
npm run test:census
npm run test:census:browser
npm run test:demo:transfer
npm run test:demo:upgrade
```

The browser fixture starts on localhost:3103 with `.next-b3-test`, uses a disposable database and synthetic credentials defined in tests/helpers/prepare-census-browser.mjs. Stop it with Ctrl+C; cleanup removes its generated database. The maintained Playwright CLI journey is tests/census-browser-b3.js. It verifies scoped records,22 revisions/history pagination, review writes, roster count, imports/retries, keyboard use and three viewports. The primary demo is retained.

Historical/manual compatibility forms now require source survey year and the CENSUS grant/scope and share the stable-reference import service. Missing analytical values remain unknown. Legacy anonymous SPES has no reliable person references: preserve anonymous row multiplicity, source label/type/year provenance and exact-batch replay, never treat matching answers as matching identities. Its consented CSV workflow remains separate; use the mapped Census importer when a historical source has stable record references or conflicts. Old unknown SPES years/source row numbers remain null.


## B4 protected workforce/social analytics

Documentation revision B4-DEMO-1 · 2026-10-24T13:06:04+08:00 · implementation snapshot B4-72de24e1b54ef82c (final tested state is recorded in the B4 review manifest).

Reference dataset remains elb-demo-2026-v1 / survey year2026. No fixture reset or schema change is required. Sign in as admin.01@example.test (password in accounts.csv) and open /admin/census/analytics. The existing B3 fixtures give Staff01 all canonical barangays (68 current respondents) and Staff02 Bambang only (5 current respondents); a JOBS-only grant does not authorize census analytics. Public/citizen employment-insight URLs show an unavailable notice under approved D08.

Expected current annual results:68 individual respondents (including retained submissions with later drafts),8 individual submissions in2025;17 submitted establishments,370 known reported workers from13 known totals and4 unknown totals;5 establishments in2025. Matching/program consent is independent of aggregated-statistics participation. Current qualifications recorded23, completed training17, current OFW experience5/former5/never58. These are synthetic respondent statistics, not municipality population totals.

Mapped import group DEMO-B3-SOURCE has2 accepted2026 observations;6 legacy observations have unknown survey year and are excluded rather than dated from activities;5 current rejected/skipped/held rows are excluded. No SPES-table observations are seeded; its demo view honestly remains empty. Separate disposable browser fixtures exercise anonymous SPES sources. Do not add source observations or organizational headcounts to individual respondents.

Use npm run demo:verify -- --counts-only to verify these declared expectations, scope/privacy, ownership/history and existing matching. This deliberately skips credential sign-in verification; omit --counts-only for the full108-account login pass. B4 analytics expectations are in expected-counts.json with fixture provenance. Aggregate CSV is available only to current CENSUS-authorized accounts and uses the applied filters. Existing sanitized SQL remains compatible because B4 changes no schema/data fixtures; regenerate/export only through guarded demo commands when data changes.

SQL transport correction B4-DEMO-2 · 2026-10-24T13:23:40+08:00 · implementation snapshot B4-ce095c15f10312ca. Windows checkout may convert export separators from LF to CRLF. demo:restore accepts that transport only when its canonical bytes reproduce the exact declared SHA256; other modifications are rejected. Raw content that already matches the checksum is preserved, including intentional newlines. No Git settings/attributes change is needed. A real Windows-checkout failure was reproduced, then a fresh disposable restore/fingerprint/manual-edit-preservation check passed. The guarded primary demo export was regenerated without changing application data.


## Employment opportunities and readiness — 2026-10-25T04:00:47+08:00

The dedicated dataset has25 migrations and the additive employment fixture revision elb-b5-fixtures-v1. Run `npm run demo:setup` for the guarded upgrade; it preserves account/password/history IDs, updates only managed synthetic vacancies through EDIT/review actions, and refuses unrelated manual changes. A completed repeat is a no-op. Never reset the ordinary database or rerun its completed additive import to enable these fields. The ordinary database deployment is a separate user action after source review; Codex did not apply the new migration there.

All28 managed sample vacancies have explicitly synthetic pay and requirements.16 are active published demonstrations; genuine vacancy-demand totals stay zero. Hour/day/month/year values and currencies are compared only in the same units. Legacy records outside this managed fixture upgrade retain unknown compensation rather than receiving invented pay. Creator-owned JOBS Staff maintain drafts; Admin alone reviews publication. Demonstration review copy explicitly avoids a genuine-employer claim, and sample external contacts are disabled.

The current recommendation service finds suggestions for18 of80 individual fixture participants,24 suggestions in total with a cap of5 per person. This differs from52 profiles authorized by the older eligibility reader: consent does not guarantee a suitable vacancy. Labelled demonstrations exercise matching simulations and remain excluded from genuine top-vacancy/employer-demand rankings. Readiness counts seven recorded information groups, not hiring eligibility.

`Check opportunities` is an explicit in-app action and will not duplicate notices for the same citizen/listing publication. Current consent refusal, withdrawal or unavailability suppresses stale actionable notices. No applications, profile forwarding or external messages are sent. Matching/refusal/no-match/source-year scenarios use persisted data; salary is not inferred from individual profiles.

Verification commands: `npm run test:opportunities` (two isolated database groups); `npm run test:opportunities:browser` (temporary localhost:3103 server and synthetic credentials in its maintained seed); `npm run demo:verify -- --counts-only` (read-only current scenarios); `npm run demo:verify` (all108 real sign-ins with normal rate limits). Export/restore commands above apply only to guarded dedicated demo names. A fresh restored demo was checked with108/108 credentials and identical scenario totals.

Definition provenance: occupational categories follow the approved project examples, not an asserted official occupational classification. Currency choices are the explicitly supported application list, not a claim to cover every currency. Certification comparisons use exact normalized recorded labels; a degree never proves a professional licence. Experience uses only recognized self-reported duration labels; missing/legacy free text remains unknown, and an explicit preferred arrangement takes priority over the current workplace arrangement.
