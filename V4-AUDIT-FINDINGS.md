# Source audit — `e-lingkod-bayann(2).rar`

Reviewed October 20, 2026. This assessment is of the **uploaded source code**, not a live test of the user's PC/database.

## What is already in V3

- Better Auth login with CITIZEN as default role; server-owned ADMIN/STAFF role.
- Protected admin shell, Super Admin-only `/admin/citizens` (email directory) and `/admin/staff` (role/module grants).
- Existing REPORTS CRUD, report photos/GPS/tracking, status transitions, server-side update history, and version conflicts.
- Five other LGU service modules remain explicitly marked as previews.

## Confirmed gap before V4

- `CivicReport.assignedOffice` was only a **free-text label**, not a staff/account assignment.
- Every REPORTS-authorized staff member could list/read/update **all reports**; no department or individual report scope.
- No report `priority` or assignee field; no queue filters for owner/priority.
- All original report updates were public to the submitting citizen, including internal routing remarks.
- The public header still linked ADMIN/STAFF to citizen-oriented account/profile pages.
- The uploaded RAR contains `.env`; do not share or commit this file. This release excludes it.

## V4 response

- **Per-case priority:** LOW, NORMAL, HIGH, URGENT.
- **Routing:** Super Admin assigns one staff-populated office and optionally an individual eligible officer.
- **Scope:** STAFF with REPORTS sees only its assigned cases plus unclaimed cases in its own department. Direct URL/API/photo access is subject to the same server-side scope.
- **Ownership:** Staff can claim a case; claim and update use optimistic concurrency and event history.
- **Permission changes:** revoked/transferred officers have cases returned to office queue with an internal audit event.
- **History:** internal vs public entries; public status changes remain visible to citizens; staff/office assignment changes are private by default.
- **Navigation:** LGU account links direct to the LGU workspace and LGU profile.

## Not verified in this environment

- Migration execution against the user's actual MySQL database, Next.js full production build, authentication in a running browser, and simultaneous updates under real network conditions. Verify locally with `V4-CASE-MANAGEMENT-SETUP.md` before demonstrating. The new migration is additive but backups are still required.

## Known next improvements

- Replace free-text office names with a relational `LguOffice` table and validate ownership via its ID.
- Server-side filtering/pagination, case due dates/SLA, audit dashboard, notification queue, and actual department dispatch.
