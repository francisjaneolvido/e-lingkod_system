# eLingkod Bayan V4 — Civic Report Triage, Department Routing, and Officer Assignment

Based on the user-provided `e-lingkod-bayann(2).rar` V3 source. This is a **hackathon prototype**, not a deployed LGU application.

## Before you begin

- Back up `C:\e-lingkod-bayan` **and** export your local MySQL database.
- Stop `npm run dev` before copying the patch into the project root (the folder with `package.json`).
- Do not overwrite or share your `.env` file. This ZIP intentionally excludes `.env` and passwords.
- Confirm you already have the V3 routes `/admin`, `/admin/staff`, and `/admin/citizens`.

## How to install (PowerShell)

```powershell
# Run in C:\e-lingkod-bayan after merging the patch
npm install
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:civic
npm run typecheck
npm run dev
```

There is a new **additive** migration: `prisma/migrations/20261020223000_civic_case_assignment/migration.sql`. It adds priority, officer assignment, and internal/public audit updates without dropping original reports. This assumes all three previous migrations have been applied successfully. If migrations fail, **do not run `prisma migrate reset` or blindly run `db push` on a database containing user data**. Save the exact error and verify `.env` database URL and migration status.

`src/generated/prisma` in the complete source is copied from the uploaded V3. Run `npx prisma generate` locally after deploying this migration to regenerate the client against the updated schema. No credentials were included in the ZIP files.

## Team setup first

1. Super Admin logs in to `/admin/staff` and assigns real, registered test users to the `REPORTS` module; give each user an office (`Public Information Office`, `MDRRMO`, `Municipal Engineering Office`, etc.). Be consistent with office spelling.
2. At `/admin/reports`, Super Admin triages by priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`) and routes each case to an office that has at least one REPORTS-authorized staff member.
3. Super Admin can **also** select an individual responsible officer, or leave the case **Unclaimed** in that office's queue.
4. A REPORTS-authorized LGU Staff account can see only personally assigned reports plus unclaimed reports routed to its own office. Another office's reports cannot be accessed using a direct URL or the photo API.
5. An LGU Staff member can claim an unclaimed case in its own office. A concurrent claim is blocked by the report version check.
6. Only the personally assigned officer can change status or leave progress notes. Only the Super Admin can change office, assignee, or priority.
7. Every case change logs the actor and action. Status changes are publicly visible in the submitting citizen's report timeline; assignment/priority-only notes are internal by default. The Super Admin/authorized LGU staff can view internal history; citizens cannot.
8. Revoking REPORTS access or transferring a staff user to another department returns that user's assigned cases to the former office queue and logs the reassignment, without deleting report history.

## Smoke test: create two sample offices and reports

Test as **Super Admin**, **PIO staff**, **MDRRMO staff**, and **Citizen** in separate private-browser sessions. Use fictional demo accounts and photos. Check:

- Super Admin can open all reports, choose `URGENT`, assign office PIO and officer PIO Staff A.
- PIO Staff A sees their case; MDRRMO staff cannot open it by URL or evidence photo URL.
- PIO Staff B, if created, can see an *unclaimed PIO report* and click **Claim this case**. PIO Staff A cannot claim it after B succeeds.
- After a staff status update from `UNDER_REVIEW` to `IN_PROGRESS`, the citizen sees only the public status/note, not internal reassignment discussions or officer identity.
- The Super Admin can revoke PIO Staff B's REPORTS permission; their cases return to the PIO office queue and can be claimed by another authorized staff member.
- The Registered Citizens directory remains visible only to Super Admin. Ordinary staff cannot open it by direct URL.
- Test the route API as unauthorized user: `PATCH /api/admin/reports/<id>` must return 403, and photo evidence must not be obtainable.

## Known limitations / next upgrades

- All report queue filters apply to up to **200 loaded cases at a time**; use Load More for older cases. A production system needs server-side search/filtering and cursor pagination for large datasets.
- Department names currently reuse the V3 `User.department` string, so Super Admin should use one consistent office name. A dedicated Office/Department database table is a future hardening task.
- No real-time alerts, email/SMS notifications, automatic SLA/escalation, geofencing, approval hierarchy, or emergency dispatch is implemented here.
- `URGENT` is a triage label and should **not** be treated as an actual emergency call/dispatch system.
- Database migration, permissions, and actual browser behavior still need local end-to-end verification on your computer. Static syntax and in-repo validation tests were run in the packaging environment.
