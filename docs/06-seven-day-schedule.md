# Seven-day implementation schedule

[Documentation home](../README.md) · [Prerequisites](01-prerequisites.md) · [Setup](02-installation-and-environment-setup.md) · [Architecture](03-project-architecture.md) · [Development](04-development-phase.md) · [Testing](05-testing-phase.md) · [Troubleshooting](07-troubleshooting.md)

## Capacity and commitments

This is a conditional plan for three student developers, not a record of completed work or a guarantee that seven days will be sufficient. The current repository has UI and MySQL/Prisma/Better Auth code. Supabase Auth/Postgres/Storage migration and all persistent feature workflows remain implementation work. Missing local dependencies, cloud accounts, or limited familiarity with SSR authentication and RLS can consume a substantial part of the week.

Budget roughly 2.5–3 hours per developer per day. The working plan below uses **3 hours on Days 1–6 and 2 hours on Day 7: 20 hours each, 60 person-hours total**. The broader 2.5–3-hour range gives 52.5–63 person-hours across seven days. A two-hour final day is intentional. Review, integration, debugging, and documentation are work inside this budget; they are not extra evening hours.

| Developer | Feature ownership: UI, server operations, data, and tests | Small shared responsibility |
| --- | --- | --- |
| D1 | Civic reporting; emergency hotlines | Auth bridge: a brief Day 1 Supabase bootstrap PR and coordination of shared auth changes. |
| D2 | Online services; municipal offices and projects | UI/release bridge: shared states/navigation and coordinated dependency/deployment changes. |
| D3 | Census; deterministic census-based job matching | Schema coordinator: order reviewed migrations and apply them to the shared Supabase project. |

These bridge roles do not create frontend, backend, or testing specialists. Each developer delivers a complete working feature and checks it. D3 does not author every table, and D2 does not build everyone else's interface.

### Scope order

| Priority | Deliverable | Release gate |
| --- | --- | --- |
| P0 | Supabase login/session/roles/RLS; private persistent civic report creation, tracking, staff status, required location and photo-upload capability; service request/review/tracking; private staff census encoding/management and minimal aggregates; authorized census-based job matching; checks and verified deployment | Must pass. A photo is optional when reporting, but the upload path itself must work. No mock persistence or disabled security as a fallback. |
| P1 | Verified or explicitly noncallable hotline directory; municipal office/project listings; public jobs with simple filters; small synthetic census JSON import | Keep all six product modules visible through small usable slices. Use a few rows and basic lists instead of adding depth. |
| P2 | Realtime, Web Push, email, Cron jobs, service-document uploads, advisories | Do not begin until P0/P1 and their checks pass with time remaining. The seven-day baseline has no dedicated P2 budget. |

The common field, status, role, matching, and Storage contracts are fixed in [architecture](03-project-architecture.md). Do not improvise incompatible statuses in parallel. Use synthetic census data, aliases, and synthetic external references. No real resident identifiers or unverified emergency phone numbers enter the demo.

### Daily working rhythm

For a normal three-hour day, reserve about 15 minutes for synchronization, 105 minutes for the day's main task, 30 minutes for validation, 20 minutes for review/integration, and 10 minutes for notes and handoff. Shift the main-task block into debugging on Days 5–6. Pair briefly on a specific blocker; avoid having all three developers wait on one installation or screen.

Open small feature PRs and integrate working slices from Day 2, not on Day 5. Author-to-reviewer cycle is **D1 → D2 → D3 → D1**. The reviewer checks behavior, authorization, schema implications, and the attached evidence. Agree a temporary owner before editing shared auth, root layout/config, shared UI, `package.json`, or the lockfile. A reviewer can request a correction without becoming the feature owner.

## Day 1 — Close setup and architecture contracts

**Objective:** make the chosen stack real enough to build against, and freeze the small shared contracts before parallel feature implementation.

| Developer | Responsibility within the three-hour block |
| --- | --- |
| D1 | Inspect existing Better Auth consumers; build a small shared auth bootstrap with Supabase browser/server clients, cookie refresh through Next.js 16 `src/proxy.ts`, registration/login/logout, validated server identity, and role lookup. Update the existing homepage/account consumers as part of the migration rather than leaving two auth systems active. |
| D2 | Establish the Node.js 24/dependency baseline using [setup](02-installation-and-environment-setup.md); coordinate one dependency/lockfile PR. Reuse the brand and existing UI; agree shared field/error/status components. Author service/reference-data schema changes and do a Vercel account/environment/redirect readiness check. |
| D3 | Coordinate the schema contract; apply a reviewed base profiles/role-helper migration early so D1 can verify auth. Author census/jobs schema and policies. Review feature-owner migrations for ordering, ownership, indexes, and policies; prepare synthetic worker/job rows and demo account provisioning instructions. |

**Deliverables and dependencies:** agreed roles (`citizen`, `staff`, `admin`), exact statuses and tracking formats, table/field ownership, private bucket names, and match inputs/formula; a brief D1 auth PR; reviewed timestamp-ordered migrations; a recorded shared-cloud application log. D1/D2 author their own feature migrations. D3 applies approved files in order through Dashboard SQL Editor; do not use the old Prisma migrations for Supabase. A local Supabase CLI is not required, and Dashboard execution is not automatic CLI migration bookkeeping.

**Definition of done:** a new synthetic citizen can sign in and out; a protected server read rejects an unauthenticated caller; the role defaults to `citizen` and a direct role-edit attempt fails; one local browser session reaches the migrated homepage/account. All developers know how to use the shared environment and no secret is in a PR. Record actual lint/typecheck/build results rather than assuming the baseline is healthy.

**Timebox and fallback:** spend at most 30 minutes alone on an environment blocker before involving the relevant bridge owner. If auth migration or base RLS is still open at day's end, give it the first 45 minutes of Day 2. If still unresolved, explicitly revise the forecast and reduce feature depth that morning: fixed service fields, a few list rows, basic staff tables, and no P2. Do not mark auth complete, retain a pretend login, or remove permission checks to preserve the date. If protection cannot be verified, a deployed data-handling demo is not ready.

## Day 2 — Build parallel persistent vertical slices

**Objective:** integrate one small real workflow per owner, including the data boundary.

| Developer | Responsibility |
| --- | --- |
| D1 | Build report form and create action, database-generated `REP-` tracking ID, required location label/coordinates, permission-based GPS, manual fallback, own-report read, and the private photo upload/finalization path. Use `photo_state = none/pending/ready/failed`; no success message while a selected photo is unfinished. |
| D2 | Build one service application using configured service types, validated allowed fields, database-generated `SRV-` reference, persistence, and the citizen's own request detail/list. Reuse the auth bridge and shared form states. |
| D3 | Build staff-only census list/create/edit with synthetic records, allowed employment/age/income bands, unique `external_ref`, and small private aggregate counts. Seed a few active synthetic jobs and implement the pure match scoring function against the agreed minimal projection. |

**Deliverables and dependencies:** three reviewed vertical-slice PRs on the integration branch, with schema files already applied in the documented order. Auth and profile role validation must be functioning; a blocked auth gate takes priority over additional screens.

**Definition of done:** saved records survive a reload; invalid input produces field errors; citizen A cannot read citizen B's report/request by changing a URL or Data API filter; citizens cannot access worker rows. D1 verifies a selected photo uploads privately and can be read by its owner, including a failed upload/retry path. Each owner runs the affected manual checks plus lint/typecheck/build before integration.

**Timebox and fallback:** allow 20 minutes for a map-library integration problem, then continue with usable manual coordinates/location label while correcting the map later. Do not substitute fabricated location values. Keep file selection to one supported image at most 5 MB. Limit the first service to a short form; it remains a real request workflow. If a slice cannot merge, record the blocker and assign a concrete first task for Day 3 instead of stacking another unintegrated feature.

## Day 3 — Complete primary citizen and staff flows

**Objective:** complete the P0 workflow loop, including rejection paths and deterministic results.

| Developer | Responsibility |
| --- | --- |
| D1 | Finish staff report queue/detail/status updates, owner tracking, location display, short-lived private photo viewing, and upload cleanup. Verify files belong to the authorized parent, not just an owner folder. Reject unsupported file bytes/type/size during finalization and prevent incomplete photos from entering the staff queue. |
| D2 | Finish staff service queue/detail and allowed status transitions; verify citizens see updated statuses. Provide pending/empty/error states and preserve safe input on validation errors. Keep service documents and payments outside core scope. |
| D3 | Connect staff worker selection to job matching. Normalize/deduplicate skills, implement the 70/20/10 formula, deterministic `job.id` ties, and zero-score exclusion. Explain score contributions and show the no-match state. Ensure the match projection excludes socioeconomic fields. |

**Deliverables and dependencies:** report and service review loops on the integration branch; census management and authorized job matching connected to persistent data; updated manual verification notes. Apply any small corrective migration through the same coordinator/log process.

**Definition of done:** citizen submits, staff reviews, citizen reloads and sees the changed status. A citizen cannot set status/reviewer/owner or mutate their profile role. Staff can encode a worker and obtain repeatable matches; public job browsing cannot reveal individual census data. Test GPS denial, invalid coordinates, oversized/wrong-type photo, session expiry, duplicate synthetic worker reference, and no matching job.

**Timebox and fallback:** one 20-minute cross-owner pairing session per unresolved shared blocker. If primary flows are late, remove charts, extra filters, custom dashboards, and decorative interaction work. Keep a usable staff table and short forms. Preserve the photo capability, location fallback, matching rule, persistence, and security checks. Update the forecast honestly if these still do not fit.

## Day 4 — Add the supporting slices and freeze features

**Objective:** make the six-module demonstration coherent with small P1 features, then freeze new functionality.

| Developer | Responsibility |
| --- | --- |
| D1 | Build the hotline list with clear agency/category labels. Add source URL and verification date for real callable numbers; otherwise use visibly illustrative noncallable placeholders. Finish report usability issues found on Day 3. |
| D2 | Add small published office and project lists with basic details and navigation. Confirm reference service requirements/fees are sourced or marked illustrative. Apply shared mobile/empty/error-state fixes and confirm deployment environment/redirect settings. |
| D3 | Add public active-job filters and the SPES-style synthetic JSON import: at most 50 rows, whole-batch validation, rejected invalid batch, preview, then one atomic upsert by `external_ref`. Verify retry does not duplicate rows; label it a demo import, not an official SPES form. |

**Deliverables and dependencies:** all six modules have a small usable demonstration slice; a feature-freeze list distinguishes working behavior, remaining defects, and deferred P2. No browser-facing worker directory is introduced. Public reference data must be safe to publish.

**Definition of done:** public jobs/filtering, hotlines, offices/projects, and synthetic import work against the same integrated application. Keyboard access, narrow-screen forms, loading/empty/error messages, and the original Poppins/navy/gold identity remain coherent. All links lead to working content or a clearly labelled deferred action. Illustrative images and data do not imply real municipal accomplishments.

**Timebox and fallback:** cap each reference list at a handful of rows and one plain detail view where needed. Use simple text/list layouts instead of another component system. Do not wait indefinitely for a verified hotline source: show a noncallable placeholder with its limitation. Keep the small JSON import; omit spreadsheet parsing, file mapping, bulk editing, and import history. Freeze at the end of the block even if P2 has not started.

## Day 5 — Resolve integration defects and rehearse release

**Objective:** use the already integrated branch to find cross-feature failures while time remains to fix them.

| Developer | Responsibility |
| --- | --- |
| D1 | Run report/auth/Storage flows in the integrated app; fix cookie refresh, role checks, cross-user access failures, photo finalization, and orphan cleanup. Review D3's PRs. |
| D2 | Coordinate the shared integration/release checklist, fix navigation/mobile/service issues, and prepare a Vercel preview with the intended environment. Review D1's PRs. |
| D3 | Review ordered migration replay on a disposable Supabase project and compare policies/grants/schema with the application log. Fix census/import/matching defects and direct API permission failures. Review D2's PRs. |

**Deliverables and dependencies:** a release candidate preview; a completed migration application/replay record; a prioritized defect list with one owner each. No repeated blind SQL execution and no new P2 features.

**Definition of done:** all feature branches needed for the demo are integrated; lint/typecheck/build pass on the release candidate with the intended runtime; a second developer reproduces each P0 happy path. Auth callbacks use the intended origins, a new session survives a reload, and no personalized response is shared through caching. The app works through normal refreshes without Realtime, push, email, or Cron.

**Timebox and fallback:** spend at most 30 minutes deciding whether a defect is blocking, then fix the top failure. Remove unfinished optional UI from the demo navigation and record it as deferred. Never hide an RLS failure with a secret key, public bucket, unrestricted grants, or a mock response. If ordered migration replay fails, correct it before calling the release candidate reproducible.

## Day 6 — Test, debug, and verify the deployment

**Objective:** spend the day's capacity on evidence and repairs, then verify the exact deployed build.

| Developer | Responsibility |
| --- | --- |
| D1 | Exercise auth/report/photo/location happy and failure paths, citizen A/B isolation, staff access, role-edit denial, and session expiry. Fix blocking defects and have the reviewer retest. |
| D2 | Exercise services, public reference pages, mobile/keyboard behavior, deployed redirects, navigation, and error states. Coordinate final production/preview environment checks and deployment smoke test. |
| D3 | Exercise direct RLS denials, individual census confidentiality, whole-batch import rejection/atomic upsert/retry, match fixtures/ties/no-match, and schema/index checks. Confirm synthetic data only. |

Use [the testing phase](05-testing-phase.md) as the acceptance checklist. Allocate roughly 90 minutes to targeted tests, 45 minutes to fixes, and 45 minutes to reviewer retests/deployed smoke checks. Avoid starting a new test framework late in the week; the repository currently exposes lint/typecheck/build scripts and has no configured test runner. Record manual results with the account role, action, expected result, actual result, and environment.

**Deliverables and dependencies:** completed test evidence, corrected release candidate, deployment URL, known-limitations list, and a stable synthetic demo dataset. Fixes require targeted regression checks and a new successful build before deployment.

**Definition of done:** `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` pass for the candidate. The deployed HTTPS URL passes login/logout, report plus optional photo/location, service review, authorized census/matching, public lists, and citizen A/B negative checks. Private files do not have public URLs; the browser bundle contains no privileged secret. A local success is not proof that production redirects, cookies, or Storage work.

**Timebox and fallback:** stop nonblocking visual fixes after 30 minutes. Defer P2 entirely if any core test remains open. If hosting is unavailable, record the external blocker, demonstrate a previously verified local build only when appropriate, and state deployment is incomplete. If security or persistence still fails, document the limitation and revise the release goal; do not present the system as ready for real residents.

## Day 7 — Regression, demonstration, and handoff

**Objective:** use two hours per developer to confirm the release, rehearse a short presentation, and hand off a reproducible prototype.

| Developer | Responsibility |
| --- | --- |
| D1 | Recheck auth, reporting, private photo, location fallback, and hotline labels; present the citizen report/staff resolution portion. |
| D2 | Recheck service status flow, offices/projects, layout, and deployed URL; lead the demonstration and explain scope/status honestly. |
| D3 | Recheck census/import/matching and permission denials; present the private staff workflow and explain the deterministic scoring. |

Reserve about 30 minutes for regression, 30 minutes for two rehearsal passes, 30 minutes for handoff/presentation notes, and 30 minutes for a small final correction and retest. No new functionality. Any code correction still needs the relevant checks before redeployment.

**Deliverables:** final URL and tested revision, setup/migration log, test evidence, documented limitations, a short presentation, and named owners for follow-up. Credentials travel through the team's private channel or password manager, never a committed document or slide. Preserve historical setup files and explain that they describe the former MySQL/Better Auth approach.

**Definition of done:** another developer can follow [setup](02-installation-and-environment-setup.md), identify the required environment, replay the ordered reviewed migrations against a clean project with an explicit application record, and reproduce the demo. Present only checks that were actually run. A seven-day target does not imply every milestone has already been achieved.

## Six-to-eight-minute demonstration

Prepare three separate browser sessions in advance: synthetic **citizen A**, synthetic **citizen B**, and **staff**. Create users through Supabase Auth's supported signup/admin flow; create/confirm their profiles and promote only the staff demo account through a privileged controlled path. Verify this before presenting. Do not create staff by changing signup metadata, editing local storage, or posting a role from the public form. The admin role can be verified separately and need not occupy presentation time.

| Time | Presenter / demonstration | Evidence shown |
| --- | --- | --- |
| 0:00–0:40 | D2 opens the deployed homepage and explains the six modules and prototype boundary | Original brand; illustration/synthetic-data labels; working navigation. |
| 0:40–2:20 | D1 signs in as citizen A, submits a report with a supported photo, demonstrates permission-based GPS or manual location fallback, then reloads the saved report | Persistent `REP-` tracking ID, valid location, completed private upload, correct initial status. |
| 2:20–3:10 | D1 uses staff session to move the report to `in_review`, then shows citizen A's refreshed view; citizen B cannot open it | Staff authorization, status persistence, cross-user denial. Do not show the signed URL or tokens. |
| 3:10–4:10 | D2 submits a service request, reviews it as staff, and refreshes citizen tracking | Persistent `SRV-` reference and allowed `under_review`/`ready` workflow. Explain that this is demo processing, not official issuance. |
| 4:10–5:40 | D3 opens staff census, encodes or edits a synthetic worker, previews a tiny valid import, and runs matching | Private rows, idempotent synthetic reference, visible 70/20/10 score contributions and stable ordering. |
| 5:40–6:30 | D1/D2 show hotline, office/project, and public job-filter slices | Verified source/date or noncallable placeholders; published reference information; no public worker rows. |
| 6:30–7:30 | D2 closes with tested behavior, known limitations, and handoff | Test evidence, optional items deferred, next-step ownership. Leave room for a question or one demonstrated validation error. |

Do not place real resident records, private account credentials, unverified callable hotlines, or invented municipal accomplishments in the slides. If a live dependency fails, explain the failure and use previously captured, clearly labelled evidence of the tested revision; do not turn an untested mock into a live-system claim.

## Risk triggers and scope decisions

| Trigger | Decision / owner |
| --- | --- |
| Day 1 auth/RLS migration is still open on Day 2 morning | All owners prioritize the shared gate; D1 leads auth and D3 policies. Cut depth immediately, communicate the revised forecast, and preserve protected core flows. |
| A developer is unfamiliar with Supabase policies or SSR cookies | Timebox one focused pairing session and use the official references in [architecture](03-project-architecture.md). Test direct denials before adding screens. |
| Package/config conflict or shared-file overwrite | D2 coordinates one owner and reviewed change; all owners retest affected routes. No force install, casual downgrade, or simultaneous lockfile editing. |
| Map tiles or location permission fail | D1 keeps explicit manual coordinates/location label and usable non-map output; do not invent a location. |
| Official emergency/reference data cannot be verified in time | D1/D2 use labelled noncallable/illustrative content. The list remains demonstrable without misleading users. |
| P0/P1 checks are incomplete at feature freeze | Freeze additions, defer all P2, and spend integration/test time on the failure. Never borrow the full testing reserve to add features. |
| A release still fails persistence, authorization, or deployment verification | Record the failed gate and limitation, correct the release forecast, and present only the demonstrated prototype behavior. The deadline does not override the acceptance criteria. |

For feature-level implementation steps, use [development](04-development-phase.md). For pass/fail evidence and direct authorization checks, use [testing](05-testing-phase.md). For environment, auth, Storage, map, and build problems, start with [troubleshooting](07-troubleshooting.md).
