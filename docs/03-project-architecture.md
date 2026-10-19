# Project architecture

[Documentation home](../README.md) · [Prerequisites](01-prerequisites.md) · [Setup](02-installation-and-environment-setup.md) · [Development](04-development-phase.md) · [Testing](05-testing-phase.md) · [Seven-day schedule](06-seven-day-schedule.md) · [Troubleshooting](07-troubleshooting.md)

## Status and architectural decision

This is the proposed architecture for the seven-day implementation. It is not a description of a completed Supabase integration. The repository currently has a Next.js App Router interface, authentication forms, server-side Better Auth calls, a MySQL Prisma schema, generated Prisma code, and a Better Auth Route Handler. Civic reports, service applications, census management, and job matching are not implemented end to end. No installed `node_modules` or usable local environment was observed during documentation review; runtime behavior has not been verified.

Use a **modular monolith**: one Next.js application, one Supabase project, and one Vercel deployment. Organize each feature's UI, validation, server operations, and data access together. Three developers can build complete feature slices without maintaining a separate API service or several deployment pipelines.

| Layer | Proposed responsibility | Existing implementation / required work |
| --- | --- | --- |
| Next.js 16.4.2, React, TypeScript | App Router pages, Server Components, form mutations, authorization, response shaping | Existing foundation; adapt auth consumers and add feature routes. Keep the existing `src/` layout. |
| Tailwind CSS 4 and shadcn/ui using Base UI | Shared accessible inputs, dialogs, cards, tables, and responsive layouts | Existing components and brand assets should be reused; do not replace the component preset. |
| Supabase Auth | Email/password registration, sign-in, sign-out, cookie-based SSR sessions | Replace Better Auth and its Prisma adapter deliberately; this migration is a Day 1 dependency. |
| Supabase Postgres | Application records, constraints, grants, row-level security (RLS) | New schema and reviewed migrations are required. Existing MySQL migrations cannot be applied here. |
| Supabase Storage | Private report photos; optional later service documents | Buckets, object policies, upload/finalization, and failure cleanup must be implemented. |
| Leaflet and OpenStreetMap | Client-side location picker and report location display | Planned. Load browser-only map code in a Client Component; retain manual location entry. |
| Vercel | HTTPS deployment and preview URLs | Planned deployment must be tested with the Supabase redirect configuration. |
| Optional services | Realtime, Web Push, email, scheduled jobs | P2 only. The core system must work through normal reads and refreshes. |

The team runtime is Node.js 24 LTS; the framework's own minimum is not the overall project minimum. Keep the existing dependency baseline until one reviewed shared dependency PR handles the Supabase packages, mapping packages, and any necessary React/React DOM security alignment. See [setup](02-installation-and-environment-setup.md) for the verified package and environment instructions.

## Boundaries and request flow

Server Components read authorized data and pass only the fields a screen needs. Client Components handle browser interactions such as location permission, map controls, file selection, and pending form state. Feature Server Actions perform ordinary mutations: create a report, submit a request, change a staff status, encode a worker, or request job matches. Every action remains a callable server endpoint and must validate identity, role, ownership, and input itself. A hidden button or protected layout is not an authorization boundary. [Next.js data security guidance](https://nextjs.org/docs/app/guides/data-security)

Use Route Handlers for HTTP-specific boundaries: the Supabase confirmation/callback flow, and optional future webhooks. An upload handler is an option only when its request and hosting limits have been checked. The normal report-photo design is a direct authenticated upload to private Supabase Storage, followed by a small server finalization action. This avoids passing a 5 MB file through a Server Action: its default request-body limit is 1 MB. Do not raise limits casually or assume a hosting platform accepts the same payload. [Server Action body limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)

Do not build a second REST API for every form. Keep data access in server-only feature modules, return explicit results, and reuse a small authorization helper. Realtime subscriptions, if eventually added, must obey the same permissions and provide a normal refresh fallback.

### Suggested structure

The following tree is a **future structure**, not a list of files already created. Route groups in parentheses do not appear in URLs.

```text
src/
  app/
    (auth)/login/                # existing route; migrate its implementation
    (auth)/register/             # existing route; migrate its implementation
    (citizen)/reports/new/
    (citizen)/reports/[id]/
    (citizen)/services/[slug]/apply/
    (citizen)/requests/[id]/
    account/                    # existing; add own reports/requests here
    staff/
      reports/
      requests/
      census/
      jobs/matches/
    hotlines/
    offices/
    projects/
    jobs/
    auth/confirm/route.ts        # confirmation handler if that flow is selected
    auth/callback/route.ts       # code exchange only if needed by selected auth flow
    loading.tsx / error.tsx      # add at useful route boundaries
    page.tsx / layout.tsx        # existing shell
  components/
    ui/                         # existing shadcn/Base UI primitives
    layout/                     # existing header/footer; add staff shell
    shared/                     # existing logo; shared statuses, empty/error states
  features/
    auth/                       # existing forms; proposed auth/role helpers
    landing/                    # existing sections
    civic-reporting/             # components, schemas, actions, queries, types
    online-services/
    emergency-hotlines/
    municipal-directory/         # offices and projects
    workforce-census/
    job-matching/
  lib/
    supabase/browser.ts         # createBrowserClient
    supabase/server.ts          # request-scoped createServerClient
    supabase/proxy.ts           # refresh-cookie helper
    validation/                 # only genuinely shared validators
  proxy.ts                      # Next.js 16 session refresh entrypoint
supabase/
  migrations/                   # future ordered reviewed SQL; no SQL added by these docs
```

Keep feature-specific validation and queries with that feature. Shared code should have at least two real consumers before it becomes a broad abstraction. Do not move all work into one large `lib/actions.ts` or one shared dashboard component.

### Route and access contract

“Existing” below means a source route exists, not that it passed a runtime test. Planned tracking remains private even though IDs are shareable-looking strings.

| URL | Intended audience and behavior | Status |
| --- | --- | --- |
| `/` | Public landing page; signed-in citizen gets a personal greeting | Existing; uses Better Auth today. Preserve the shared homepage. |
| `/login`, `/register` | Public auth forms | Existing; migrate to Supabase. New users always become `citizen`. |
| `/account`, `/account/profile` | Signed-in account and read-only profile | Existing; replace Better Auth checks; account report/request cards are placeholders today. |
| `/dashboard` | Legacy authenticated redirect to `/` | Existing; preserve the redirect during migration. |
| `/api/auth/[...all]` | Existing Better Auth endpoint | Existing; retire after all consumers migrate. It is not the proposed Supabase callback. |
| `/reports/new`, `/reports/[id]` | Citizen creates a report or reads an owned report | Planned; staff/admin can inspect reports through staff routes. |
| `/services/[slug]/apply`, `/requests/[id]` | Citizen applies for a configured service and tracks an owned request | Planned; authentication required for submission and private tracking. |
| `/hotlines`, `/offices`, `/projects`, `/jobs` | Public verified/published information; jobs have simple filters | Planned P1. No individual census records or public worker search. |
| `/staff/reports`, `/staff/requests` | `staff` and `admin` review records and update allowed statuses | Planned P0. Recheck authorization in every read and mutation. |
| `/staff/census`, `/staff/jobs/matches` | `staff` and `admin` encode/manage census and select a worker for matching | Planned P0. No citizen access to individual worker rows. |
| `/auth/confirm`, `/auth/callback` | Auth-token confirmation or code exchange as required by chosen Supabase flow | Planned only as needed; allow only approved same-site redirect destinations. |

The homepage's current tracking demo is presentation content. Replace it with a link into authenticated tracking when persistent reports exist; never expose report details from a tracking string alone.

## Authentication and authorization

Create separate browser and request-scoped server Supabase clients using `@supabase/ssr`. The server client obtains the current cookie store with `await cookies()`. Place Next.js 16's refresh entrypoint at `src/proxy.ts`, beside `src/app`, with a helper under `src/lib/supabase/`. Follow the current Supabase SSR guide when implementing cookie reads/writes and return the response carrying refreshed cookies and cache headers. Proxy refresh is not a replacement for feature authorization. [Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Next.js cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)

For every protected server operation, validate identity with `getClaims()` or use `getUser()` when a fresh Auth user lookup is needed; reject errors or missing identity. Read the server-managed `profiles.role` for role decisions and apply ownership filters. Never authorize from browser state, user-editable metadata, or `getSession()` alone. Passwords belong only to Supabase Auth: no password field in application tables, request logs, imports, or client storage. [Supabase identity validation guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)

| Application role | Allowed core operations |
| --- | --- |
| `citizen` | Read own profile; create/read own reports and service requests; upload/read attachments belonging to those records; read public reference information. |
| `staff` | Review reports and requests; change workflow status; manage individual census records; view private aggregates; run census-based job matching. |
| `admin` | Staff operations plus controlled role/reference-data administration. No public signup option creates this role. |

`profiles.id = auth.users.id`. Create profiles through a trusted database trigger or controlled server provisioning that fixes the default role to `citizen`. Ignore any role supplied during registration. A citizen must never update `role`, including through a direct Data API call. Grant profile updates only on explicitly allowed columns if editing is added; keep role changes in a privileged admin path. Do not grant table-wide client UPDATE and assume the form protects the role field.

### Database policy design

Enable RLS and define least-privilege table grants for every exposed application table. Policies must cover the necessary SELECT/INSERT/UPDATE/DELETE operations; an absent mutation feature should not have an accidental write grant. Citizen ownership uses `auth.uid() = citizen_id` with both existing-row and new-row checks where appropriate. Ownership columns and generated identifiers must be immutable to citizen updates. Staff paths require a database role check as well as server checks. These are project requirements; actual policies remain implementation work. [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)

Avoid a policy on `profiles` that queries `profiles` through that same policy, causing recursion. A narrowly scoped helper such as `private.is_staff_or_admin()` can read the caller's role under a carefully owned `SECURITY DEFINER` function. Keep it in a non-exposed private schema; fully qualify referenced objects, fix `search_path` to trusted schemas (or an empty path with fully qualified names), revoke default `PUBLIC` execution, and grant only the execution/schema access needed by intended policies. It takes no caller-supplied user ID and cannot change roles. Review function ownership and grants together. [PostgreSQL secure definer functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

The browser and ordinary server operations use the publishable key with the user's JWT so RLS remains effective. A Supabase secret/service-role key bypasses policy protection and is not needed for core flows. Never put one in a `NEXT_PUBLIC_*` variable, a Client Component, screenshots, or logs. An optional privileged job must have a specific server-only purpose and its own authorization review.

## Data contract

These are proposed fields for the first implementation, not generated SQL. Unless stated otherwise, tables use a database-generated UUID `id`, `created_at` and `updated_at` timestamps, non-null required fields, and database-maintained update timestamps. Use UUID foreign keys, explicit checks, and bounded text lengths agreed in the validation schema. Apply equivalent validation on the server; TypeScript types do not validate incoming requests.

| Entity / owner | Proposed fields and relationships | Constraints, access, and useful indexes |
| --- | --- | --- |
| `profiles` / D1 | `id` FK to `auth.users.id`, `display_name`, nullable `barangay`, `role`, timestamps | One profile per Auth user. Role check: `citizen`, `staff`, `admin`; default `citizen`, server-managed. Own-profile read; staff helper reads role safely. No duplicated password or unnecessary email copy. |
| `incident_reports` / D1 | `citizen_id` FK profiles; `submission_key`; `tracking_id`; `category`; `description`; required `latitude`, `longitude`, `location_label`; `status`; nullable `photo_expected_path`, `photo_path`; `photo_state`; nullable `staff_note`, `reviewed_by` FK profiles, `reviewed_at`; timestamps | `tracking_id = 'REP-' + full database-generated UUID`, unique and immutable; unique `(citizen_id, submission_key)` for safe retries. Status: `submitted`, `in_review`, `resolved`, `rejected`. Latitude −90..90, longitude −180..180. `photo_state`: `none`, `pending`, `ready`, `failed`. Only own rows for citizens; staff/admin review. Index `(citizen_id, created_at)` and `(status, created_at)`; unique tracking index. |
| `service_types` / D2 | `slug`, `name`, `description`, `requirements` text array, `fee_amount`, `fee_note`, nullable `office_id` FK municipal offices, `is_active`; timestamps | Unique slug; nonnegative fee. Demo requests do not take payments or issue official permits. Published active types readable publicly; staff/admin manage. Clearly label illustrative requirements/fees if no official source. |
| `service_requests` / D2 | `citizen_id` FK profiles, `submission_key`, `service_type_id` FK service types, `reference_number`, `details` JSON object limited to that service's allowed fields, `status`, nullable `staff_note`, `reviewed_by` FK profiles, `reviewed_at`; optional P2 `document_path` and attachment state; timestamps | `reference_number = 'SRV-' + full database-generated UUID`, unique and immutable; unique `(citizen_id, submission_key)` for safe retries. Status: `submitted`, `under_review`, `ready`, `rejected`. Own-record access plus staff/admin review. Index `(citizen_id, created_at)`, `(status, created_at)`, `service_type_id`; validate JSON keys, types, and size. |
| `worker_records` / D3 | `external_ref`, synthetic `display_name` alias, `occupation_code`, `skills` text array, `barangay`, `employment_status`, `age_band`, `income_band`, nullable `created_by`/`updated_by` FKs profiles; timestamps | Unique synthetic `external_ref`; employment: `employed`, `unemployed`, `self_employed`, `student`. Age: `18_24`, `25_44`, `45_64`, `65_plus`, `undisclosed`; income: `low`, `middle`, `high`, `undisclosed` (synthetic categories, no official thresholds); no dates of birth, exact income, national IDs, or real household identifiers. Staff/admin only. Index barangay/employment and occupation for staff filters; matching may scan the small demo set. |
| `jobs` / D3 | `title`, `organization_label`, `description`, `occupation_code`, `required_skills` text array, `barangay`, `employment_type`, `is_active`, nullable `created_by` FK profiles; timestamps | Synthetic or approved public listing data. Public selects active jobs only; staff/admin manage. Index `(is_active, barangay)` and occupation. No employer accounts, hiring decisions, or applications in this scope. |
| `municipal_offices` / D2 | `name`, `slug`, `description`, `address_label`, `office_hours`, nullable verified `phone`, `email`, `source_url`, `verified_at`, `is_published`; timestamps | Unique slug. Publish only approved details; noncallable placeholders for unverified phones. Index published/name. Public published reads; staff/admin manage. One office can own many service types/projects. |
| `municipal_projects` / D2 | `title`, `summary`, `office_id` FK municipal offices, `location_label`, `status`, nullable `start_date`, `end_date`, `source_url`, `verified_at`, `is_published`; timestamps | Status: `upcoming`, `ongoing`, `completed`; dates ordered when both exist. Public published reads; staff/admin manage. Index `(is_published, status)`, `office_id`. No invented budget/accomplishment figures. |
| `emergency_contacts` / D1 | `agency_name`, `category`, `area_label`, nullable `phone`, `source_url`, `verified_at`, `is_published`, `display_order`; timestamps | Categories: `PNP`, `BFP`, `hospital`, `MDRRMO`, `other`. A callable number needs a verified source/date. Public published reads; staff/admin manage. Index `(is_published, display_order)`. Unverified demo rows have no active `tel:` link. |

Relationships are deliberately small: an Auth user has one profile; a citizen owns many reports and service requests; each request references one service type; offices group service types/projects; worker records and jobs are municipal datasets managed by staff, not publicly owned citizen profiles. Matching is calculated on demand and needs no persisted matches table. Define deletion behavior explicitly: avoid deleting submitted records accidentally when reference data changes; deactivate reference rows instead. Account deletion and retention policy are outside the demo workflow and require a deliberate data-management decision before real deployment.

### State and validation rules

| Workflow | Allowed core transitions | Restrictions |
| --- | --- | --- |
| Civic report | `submitted → in_review`, then `in_review → resolved` or `rejected` | Citizen cannot set status/reviewer/owner. Terminal reopening is outside the first version. Staff queue includes only `photo_state = none` or `ready`. |
| Service request | `submitted → under_review`, then `under_review → ready` or `rejected` | `ready` means the demo review is complete; it does not claim a legally issued document. Citizen cannot set status/reviewer/owner. |
| Photo | `none` for no selected photo; selected photo starts `pending`, then `ready` or `failed` | A selected photo must finish successfully before the form reports complete success. Failed uploads offer retry or an explicit continue-without-photo action. |

Report photo **upload capability is P0**, while attaching a photo is optional for a citizen. Require a usable location: request GPS permission, let the citizen inspect/correct the map pin, and provide manual latitude/longitude plus a location label when permission, GPS, or map tiles fail. Validate finite numeric coordinates and database ranges. Do not fabricate coordinates or silently substitute the municipal center.

Use field errors for invalid input, an authentication response for expired sessions, an authorization/neutral not-found response for inaccessible records, and a retryable general message for infrastructure failures. Keep incomplete input where safe. Bound page size, reject unsupported sort/filter fields, and select explicit columns. Log an operation code and correlation ID when useful; never log passwords, access/refresh tokens, signed URLs, whole census rows, or raw private form payloads.

### Fixed MVP validation and retry rules

These are demonstration contracts, not official municipal forms or classifications. Use them for the first implementation instead of leaving each developer to invent incompatible fields.

- Reports: category is one of `road_damage`, `drainage`, `waste`, `street_lighting`, `other`; description is 10–2,000 trimmed characters; location label is 3–200 trimmed characters; coordinates must be finite and within the table ranges.
- Service type slugs are `permit`, `tax`, `clearance`. All demo forms require `applicant_name` (2–100 trimmed characters, synthetic in testing) and a syntactically valid `contact_email` (maximum 254 characters). Permit adds `business_activity` (2–100) and `location_label` (3–200); tax adds `inquiry_subject` (10–500); clearance adds `purpose` (10–500). Reject unrecognized JSON keys and cap UTF-8 serialized `details` at 8,192 bytes. These are intake examples; no government-issued ID, payment, actual tax computation or official form is required.
- Worker fields: `external_ref` is 3–64 characters, letters/digits/hyphen/underscore only; alias is 2–100; occupation is 2–64; barangay label is 2–100; skills is an array of at most 20 nonempty entries, each 2–50 characters after trim/lowercase/deduplication. Employment and age/income values use the table enums. The income labels have no currency cutoffs or benefit-eligibility meaning. Do not infer real poverty classifications from these fixtures.
- `5 MB` means **5,000,000 bytes** for application file checks. Configure the private bucket restriction to the same byte limit where supported. Reject a file of 5,000,001 bytes; treat 0 bytes as invalid. Validate allowed content as well as declared MIME/extension.
- For each report/service form attempt, generate one UUID `submission_key` and preserve that non-secret key across pending clicks, photo retries and uncertain network responses. The server validates its format, derives `citizen_id` from the session, and inserts under unique `(citizen_id, submission_key)`. On a duplicate key, return the existing owned submission and its completion state rather than inserting or overwriting it. A reused key with changed fields does not mutate the saved record; require an explicit new submission. Rotate the key only for a deliberate new form attempt. A unique tracking ID by itself does not prevent duplicate submissions.

Apply length/range checks on the trusted server path and suitable database constraints. Do not trust a disabled submit button as duplicate protection. The example import in [development](04-development-phase.md#synthetic-import-example) uses these exact worker enums.

## Private attachment design

Use private buckets named `report-photos` and, only if P2 is approved, `service-documents`. A report accepts one JPEG, PNG, or WebP image up to **5 MB**. P2 service documents accept PDF, JPEG, or PNG up to **5 MB**. Set matching bucket restrictions, then validate the actual uploaded byte count and file signature/MIME on the server; browser extension and `File.type` checks are only early feedback.

Use an object key shaped as `auth.uid()/parent_id/random.ext`. Generate the expected randomized path on the server and reserve it in `photo_expected_path` on the authorized parent before upload. Storage INSERT policies require the correct bucket, caller owner prefix, exact reserved path, owned parent, and `photo_state = pending`; do not allow arbitrary extra objects within that parent folder. Owner reads needed for finalization can access the reserved object; staff reads require a complete parent and its finalized `photo_path`. A folder-prefix check alone is insufficient: citizen A could otherwise place an object under A's folder while naming citizen B's parent ID. Staff/admin read policies also verify the corresponding parent row. Grant only the operations each flow needs; do not enable overwrite/upsert without a reason. [Supabase Storage access policies](https://supabase.com/docs/guides/storage/security/access-control)

1. An authorized create action validates fields, inserts the owned parent, and assigns `photo_state = pending` plus `photo_expected_path` when a photo was selected; keep `photo_path` null until finalization. Without a photo, save `photo_state = none` and return completed submission data.
2. The browser uploads the selected file directly with its authenticated Supabase client to that exact private path. No bypass key is involved.
3. A finalization action validates the caller and owned parent again, reads the uploaded object, checks its real bytes/type/size, sets `photo_path` to the verified reserved path, clears `photo_expected_path`, and changes `pending` to `ready`. Return the tracking ID as a completed submission only after this succeeds.
4. A failed upload/finalization remains visibly incomplete (`failed`), outside the staff queue. Retry against the authorized parent, or remove its own incomplete object/parent through a checked rollback path. Explicitly continuing without a photo removes any owned incomplete object, clears both path fields, sets `none`, and returns the same report/tracking ID as a completed submission. Clean up only the caller's verified orphan objects; never delete by an untrusted path from a form.

Storage and database writes are not a single transaction; do not claim atomic rollback across them. Keep retries idempotent and verify the final database state when a network response is lost. Staff and owners view a private object through a short-lived signed URL created after authorization (for example, 60 seconds); persist the object path, not the signed URL. A signed URL is a bearer capability until expiry, so do not log or cache it publicly. [Private Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads)

## Census and deterministic job matching

The core census flow is staff encoding, editing, filtering, and a few private aggregate counts, such as records by barangay and employment status. Keep individual rows and socioeconomic fields off public pages. Use synthetic records for the hackathon. A public aggregate view would need a separate disclosure review, including small-group suppression; it is not required for this demo.

P1 adds a **SPES-style synthetic JSON import**, not an official SPES form or integration. Accept at most 50 rows. Validate the whole payload before any write, reject the entire invalid batch with row-level errors, show a preview of inserts/updates, then perform one atomic multi-row upsert keyed by unique `external_ref`. A retry must not duplicate records. Recheck staff/admin access at preview and commit; do not trust a preview token or client-supplied role as authorization.

An authorized staff member selects a census worker. The matching function receives only `{ id, occupation_code, skills, barangay }`, excludes age/income/employment-status fields, and compares against active jobs. The public jobs page supports ordinary listing filters and never accepts an arbitrary worker ID to reveal private matches.

Normalize skills and comparison text with trim/lowercase; remove duplicate skills on both sides. Calculate:

```text
skill_score      = required_skills.length > 0
                   ? 70 * intersection(worker.skills, job.required_skills).length
                        / job.required_skills.length
                   : 0
occupation_score = non-empty exact normalized occupation_code match ? 20 : 0
barangay_score   = non-empty exact normalized barangay match ? 10 : 0
total_score      = skill_score + occupation_score + barangay_score
```

Return only totals greater than zero, ordered by the unrounded score descending and then `job.id` ascending for stable ties; round only for display. Empty values never earn exact-match points. If all totals are zero, show “No matches found.” Explain the skill/occupation/barangay contributions in the staff result. Public job filters use all selected skills and combine skills with the occupation filter using AND. This is transparent rules-based matching, with no machine learning, hiring recommendation, employer portal, or application workflow.

### Optional deadline fields

Only if P2 Cron is implemented, add nullable `due_at` and `escalated_at` (`timestamptz`) to `incident_reports` in a reviewed migration. An explicitly labelled demo rule can set `due_at` to submission time plus 24 hours; this is not a municipal service commitment. The SQL job flags unresolved overdue rows by setting `escalated_at` only when null. It must not invent a new status or dispatch an emergency response. Repeating the job leaves the flag unchanged; future deadlines and terminal records stay untouched.

## Configuration, caching, and presentation

| Environment variable | Required? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL; public configuration. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable API key; safe only with correct grants/RLS. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Explicit application origin for safe auth redirects; set for local and deployed environments. Never accept an arbitrary external return URL. |
| `SUPABASE_SECRET_KEY` | No for core | Server-only privileged job/admin work only if explicitly designed; never a normal way to bypass broken RLS. |
| Web Push / email / Cron credentials | No | P2 additions with separate setup and failure handling. |

`DATABASE_URL` is not needed for the proposed Supabase client-based core architecture. Existing MySQL/Better Auth variables remain historical until their consumers are migrated; do not copy them into a new Supabase setup by habit. Store real values in ignored local environment files and Vercel settings. The current `.gitignore` ignores `.env*`; no environment example or secrets are created by this documentation task.

`next.config.ts` currently enables `cacheComponents` and `partialPrefetching`. During implementation, put request-time cookie/auth reads and fresh personalized data behind appropriate `Suspense` boundaries. Do not put auth checks in `use cache`, share cached citizen/staff results, or cache responses that refresh session cookies. Cache only deliberately public reference data after reviewing invalidation. The present configuration has not been proven to build or run; follow the installed Next.js documentation once dependencies are available and verify direct loads as well as client navigation. [Next.js caching and runtime APIs](https://nextjs.org/docs/app/getting-started/caching)

Keep the original `public/images/elb-mark.svg`, Poppins typography, navy/gold palette, shared header/footer, and responsive spacing described in [BRAND-AND-UI-GUIDE.txt](../BRAND-AND-UI-GUIDE.txt). Add shared status badges, field errors, loading/empty/error states, and a small staff navigation shell. Preserve accessible labels, keyboard interactions, and readable mobile forms. Existing generated landing images are illustrative assets, not photographs of real municipal events or projects.

## Migration and integration responsibilities

| Contract / data area | Owner | Coordination requirement |
| --- | --- | --- |
| Auth clients, proxy refresh, profiles/role bridge | D1 | Brief shared bootstrap PR on Day 1; all owners migrate their own feature consumers. |
| Reports, report-photo policies, hotlines | D1 | Own UI, server operations, schema/policies, and verification. |
| Service types/requests, offices/projects | D2 | Own UI, server operations, schema/policies, and verification. |
| Worker records, jobs, import/matching | D3 | Own UI, server operations, schema/policies, and verification. |
| Shared schema application | D3, as coordinator | Each feature owner writes/reviews its changes; D3 orders and applies agreed migrations to the shared cloud project. |
| Shared UI and release bridge | D2 | Small, budgeted shell/dependency/deployment coordination; D1/D3 still own their feature UI and tests. |

The MySQL-to-Supabase change includes new Postgres tables and policies, Supabase dependencies, server/browser clients, proxy refresh, replacing all Better Auth imports/form calls, callback/redirect configuration, and removing obsolete runtime auth consumers only after verification. Existing accounts/passwords are not automatically portable. For the demo, create synthetic users in Supabase rather than assuming MySQL users transfer. Keep [SETUP-MYSQL-AUTH.md](../SETUP-MYSQL-AUTH.md), `START-HERE.txt`, and other historical files for context; the new setup guide is authoritative for the proposed target.

During implementation, store reviewed, timestamp-ordered SQL under `supabase/migrations/`; no such migration files are generated by this documentation. Apply them in order through Supabase Dashboard SQL Editor when the CLI is unavailable. The coordinator records filename, project/environment, application time, result, and verification evidence in the PR's migration log. Dashboard execution does not automatically create a CLI migration history. Before applying, inspect the log and actual schema; do not blindly rerun non-idempotent changes. Rehearse the full ordered sequence on a disposable project before release and retain an explicit application record for each environment. Never run existing Prisma/MySQL migrations against Supabase.

The initial shared foundation branch is **`chore/supabase-foundation`**, owned by D1; D2 reviews its UI/dependency changes and D3 reviews policies/migration order. Merge it before module branches depend on Supabase identity. Each developer then owns their feature branches; no one else pushes to an owned branch without coordinating. Use small feature branches such as `feat/civic-reporting`, `feat/emergency-hotlines`, `feat/online-services`, `feat/municipal-directory`, `feat/workforce-census`, and `feat/job-matching`. Integrate a working vertical slice daily from Day 2. Review cycle: **D1 reviews D3, D2 reviews D1, D3 reviews D2** (D1 → D2 → D3 → D1 for author-to-reviewer handoff). Coordinate a temporary edit owner for `package.json`, the lockfile, root layout/config, shared auth, and shared UI; never solve a conflict with a force install or an unreviewed downgrade.

Before integration, run `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` with the intended environment. The repository has no test runner configured: add no fictional test command. Each feature also needs a manual happy path, meaningful failure path, and direct RLS denial check; [testing](05-testing-phase.md) defines the evidence. The [seven-day schedule](06-seven-day-schedule.md) reserves time for those checks and treats a late auth migration as a scope decision, not a completed milestone.
