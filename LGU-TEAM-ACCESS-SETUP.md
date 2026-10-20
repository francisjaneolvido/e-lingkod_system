# eLingkod Bayan — Registered Citizens + LGU Staff Management (V3)

**Works with the V2 Admin Redesign and the existing MySQL / Better Auth project.**

## What is included

- **Registered Citizens:** `/admin/citizens` — Super Admin-only, searchable + paginated list with name, email, date joined, report count. Not public and not visible to STAFF.
- **LGU Staff Management:** `/admin/staff` — Super Admin can grant/revoke module permissions for existing registered accounts, assign a department and designation, and view a recent audit trail. Changes are written to MySQL.
- **LGU Staff workspace:** `/admin` — STAFF sees only their assigned modules in the sidebar and workspace. ADMIN sees all modules and manages citizens/staff.
- **Server-enforced permissions:** `REPORTS`, `SERVICES`, `EMERGENCY`, `PROJECTS`, `JOBS`, `CENSUS`. Report pages, update API, list API and private report photo delivery respect REPORTS permission; other five module routes check permission but are still labeled as prototype previews.
- **Auth:** `/login` now automatically redirects eligible STAFF/ADMIN to `/admin` (unless a valid `next` path was explicitly requested).
- **Audit:** A staff-permission change records who performed it and who was affected. Revoked accounts revert to CITIZEN; account and existing reports are retained.
- **Branding:** V2 eLingkod Bayan logo and sidebar remain in the complete ZIP.

## Install (Windows / PowerShell)

1. Stop `npm run dev` with Ctrl+C.
2. Back up the working project folder and database. Do not overwrite `.env`.
3. Extract the **V3 patch** into `C:\e-lingkod-bayan`, merging `src` and `prisma` folders. This patch assumes the **Admin Redesign V2** files are already installed. Alternatively use the **complete V3 project ZIP** and bring over your own `.env` only.
4. Start MySQL (XAMPP). In the project terminal run:

```powershell
npm install
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run dev
```

You MUST run migrate deploy + generate for this update. The new migration `20261020210000_lgu_staff_access` adds the staff tables and fields. Existing migrations `20261019045750_init_auth` and `20261019150000_civic_reporting` must also be applied, otherwise the earlier `civic_report does not exist` issue will remain.

If migration status/deploy fails, **do not run `prisma migrate reset` or `db push` against your existing data**. Save the exact terminal error, and check the `DATABASE_URL` and the migration status. The app requires an existing accessible MySQL database.

## Super Admin / Staff onboarding

1. Sign in with the existing seeded **ADMIN** account. ADMIN is the Super Admin role; this patch does not generate a new password or new Super Admin.
2. Open `http://localhost:3000/admin/citizens` to view registered citizen emails. Use test accounts for your hackathon demo.
3. The LGU staff member must **register as a normal user** first at `/register` using their own work email/password (no public STAFF registration role).
4. Sign in as Super Admin and visit `/admin/staff`. Enter the exact registered email, department, designation, and check applicable modules. Click **Assign staff access**.
5. Staff signs in via `/login`: the Staff Workspace `/admin` opens, showing permitted modules only. Existing citizen reports remain associated with their account.
6. Super Admin can click **Manage access** to change permissions or **Revoke staff access**. Revocation is immediate on fresh server requests; refresh already-open tabs.

Example team (illustrative, not seeded):
- Super Admin — all modules and account management
- Public Information Office staff — REPORTS, PROJECTS (projects currently preview-only)
- MDRRMO officer — EMERGENCY, REPORTS (emergency currently preview-only)
- PESO staff — JOBS (currently preview-only)
- Planning office — CENSUS (currently preview-only)
- BPLO officer — SERVICES (currently preview-only)

## Manual access and privacy tests

- Super Admin can open `/admin/citizens`, `/admin/staff` and `/admin/reports`.
- STAFF with REPORTS can open `/admin/reports`, read assigned workflow, and update reports; can't open `/admin/citizens` or `/admin/staff`.
- STAFF with JOBS only cannot open `/admin/reports`, report administration APIs or unassigned modules.
- CITIZEN cannot access the admin workspace or administrator APIs.
- Revoke STAFF access as ADMIN, refresh staff session, and ensure admin routes are denied while citizen login/report history remains.
- Never display citizen emails in public pages or use real personal data for a public hackathon without consent and suitable privacy controls.

**Scope:** This phase handles who can access each module, NOT assignment of an individual civic report to an individual staff member, priority queues, or department-specific case lists. Those are the next Civic Reports Management phase. The five other LGU modules still contain previews and not real application/job/census flows.

**Build note:** Local TSX syntax was checked. Full Next.js typecheck, Prisma validation/migration, end-to-end login and MySQL tests could not be run in the packaging environment because project dependencies and DB connection were unavailable. Test on the development PC before demo.
