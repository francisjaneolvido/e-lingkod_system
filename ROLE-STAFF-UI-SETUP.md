# eLingkod Bayan — Citizen/LGU Role Separation & Staff UI Update

This small patch is based on the latest available V10.5 + Services Dropdown source. It updates public navigation, citizen reporting authorization, and the Super Admin's LGU Staff Management screen. **It does not include a database migration.**

## What changes

### Account boundaries
- **Citizen:** may submit, read and respond to personal civic reports, and create an optional personal job-matching profile.
- **Super Admin:** can browse the public information website, but `/reports`, `/reports/new`, and citizen report details redirect to `/admin`. Public `/track` remains available for everyone. Operations are done in the LGU management routes.
- **LGU Staff:** same public browsing behavior as Admin. Staff tools remain subject to assigned modules and department boundaries.
- **API:** `/api/reports` (both GET and POST), `/api/reports/[id]` (GET) and `/api/reports/[id]/feedback` (POST) reject non-Citizen accounts with HTTP 403, enforced server-side. The underlying submit and citizen feedback mutations have extra role checks. Admin case APIs remain available to authorized LGU personnel.

### Staff Management UI
- `/admin/staff` now opens **Staff Directory** by default, with a search box, office filter, and visible Manage Access buttons.
- Separate tabs: **Staff Directory**, **Invite New Staff**, **Assign Existing Account**, **Activity History**.
- Invitation delivery status, pending invites, activation links and access audit records are retained. Switching between tabs does not discard an active invitation form/link during that visit.
- Civic Reports and Job Matching are correctly labeled as active staff modules; the four remaining modules are labeled preview.

## Install safely with your GitHub team
1. Confirm `git status` has no unfinished merge. Back up your local source and your MySQL database.
2. Create a branch, e.g. `git switch -c fix/citizen-roles-staff-ui`.
3. Extract this ZIP into the **project root containing package.json**. Preserve folder structure, merge only matching `src`/`tests` files, do not replace `.env`, `.git` or `prisma`.
4. Run:

```powershell
npm run test:all
npm run typecheck
npm run dev
```

If your Git working tree has teammate changes in any of the same files, compare and manually merge instead of blindly overwriting them.

## Manual smoke tests
- **Citizen account:** `/reports/new` loads, report POST succeeds, `/reports` and resolution feedback still work.
- **Admin account:** `/` loads public home. Header does not show `My Reports`, and public Civic Reporting CTA leads to `/admin`. Navigating directly to `/reports/new` or `/reports` redirects to `/admin`. An authenticated POST to `/api/reports` must return **403**. Verify `/admin/reports` still works.
- **LGU Staff:** sees public home; citizen-only routes redirect to `/admin`; authorized `/admin/reports` actions and `/admin/jobs` remain accessible with proper permissions.
- **Staff page:** directory/search/department filter, invite, assign existing and activity tabs. Test Save Permissions and Revoke on demo staff. Check invitations/activation still work.
- **Public visitors:** `/track` remains publicly accessible. Published job opportunities remain available.
- **Responsive:** check staff directory and tab navigation at mobile width.

## Testing note
The included source regression tests and TS/TSX transpile syntax checks passed in the preparation environment. Full Next.js build, semantic typecheck, live MySQL authorization flow and browser responsive interactions require verification on your local environment. No migrations required for this patch.

**Account design note:** Converting a Citizen account to a Staff account removes access to citizen-only reporting during staff assignment, but existing report records are preserved. For actual LGU deployment, separate staff and citizen identities are often preferable so personal reports aren't handled under an official role.
