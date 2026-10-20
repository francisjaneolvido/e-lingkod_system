# eLingkod Bayan — V6 integrated project (based on e-lingkod-bayann(3).rar)

## Scope and audit summary

This update uses **the latest RAR provided** as the source. The original citizen portal, eLingkod Bayan mark, Prisma migration chain, Super Admin features, LGU Staff permissions, V4 Civic Reporting, and V5 activation flow have been retained.

### Changes in V6

- **Fix V5 staff-invitation 503**: Remove the unsupported `modules` property from the Prisma `staffInvitation.upsert()` input. The saved property is `modulesJson`. The API now uses a typed, explicit allowlist of invitation database columns.
- **Better staff dashboard**: LGU users get the same branded, responsive AdminShell with a personalized header, live cards (my active cases, office queue, urgent cases, my resolved cases), assigned-case and unclaimed-office lists, and the service modules permitted to them. No fictitious counts are displayed.
- **Case permissions**: Recheck the acting staff member's current role, office, and `REPORTS` grant inside a case-claim or case-update transaction. Staff can update assigned cases and claim an open, unclaimed case in their office; only Super Admin routes/changes priority.
- **Accountability**: Revoking/changing staff permissions returns *unresolved* assigned cases to the office queue while preserving historical responsible-officer relationships on closed cases and recording an internal reassignment event.
- **Citizen privacy**: An unclaimed case does not expose its reporter's name via the staff summary API. Full citizen contact details are restricted to Super Admin or the individually assigned case officer.
- **Extra tests**: Add permission-scope tests, invitation-payload API tests, and a regression test for the Prisma `modules` error. `npm run test:all` runs all local unit tests.

No new database columns or migrations were introduced by V6. **Existing migrations from V3/V4/V5 still must be applied.**

## Install from a complete V6 ZIP

1. **Back up** your old `C:\e-lingkod-bayan` directory AND existing MySQL database.
2. Unzip V6 to a new project folder or merge the source files into your existing folder.
3. Preserve your **private local `.env`**. It was deliberately excluded from the ZIP. Never upload or share your real DB URL, passwords or API keys.
4. Run MySQL locally (XAMPP or another server). Use a fresh VS Code PowerShell terminal at the project root.

```powershell
npm install
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:all
npm run dev
```

**The first five commands are not necessary every day.** For normal starts, make sure MySQL is running and use `npm run dev`. Rerun migrations/generate only when the schema or migration files change. Do **not** use `prisma migrate reset` on an existing database with data.

`BETTER_AUTH_URL` in `.env` should match the browser origin (normally `http://localhost:3000`). For **local development demo only**, set `STAFF_INVITE_DEMO_LINKS="true"` to reveal a one-time link in the Super Admin invitation UI. For actual email delivery, configure your verified email provider's `RESEND_API_KEY` and `STAFF_INVITE_FROM`. Demo links are disabled in production.

## Three-role end-to-end smoke test

Use **separate normal/incognito browser sessions** so the three roles do not overwrite the same login cookie.

### A. Super Admin → Invite/activate LGU Staff

1. Log in with your existing Super Admin account at `/login`; open `/admin/staff`.
2. Create an invitation for a **new email**; choose a real department string (e.g., `MDRRMO`), designation, and grant `REPORTS` (plus optional other modules).
3. The invitation should appear as **Pending**. In local demo mode, securely copy the one-time activation link. No email was sent in demo mode.
4. In an incognito window, visit the link, choose a password of 12–128 characters, and activate. The invitation becomes **Activated**. The staff member can now sign in with their own email/password. The Super Admin never receives that password.
5. Open `/admin` with the staff account. It should use the same branded navigation shell but show **My Workspace**, only permitted sidebar modules, and (if `REPORTS` is granted) personalized case queues. Staff must **not** see `/admin/citizens` or `/admin/staff` (typing those URLs should also deny access).

### B. Citizen submits a report

1. Register a **separate citizen** account at `/register` or log into an existing citizen account.
2. Go to `/reports/new`. Fill in concern type, title, description, barangay, address, and attach **1–3 photos**. Choose GPS or address-based location, then submit.
3. Confirm that the system generates an `ELB-YYYY-XXXXXXXXXXXX` Tracking ID. Check `/reports` and `/reports/[id]` (citizen-only record and timeline). Copy the Tracking ID to use at `/track`.

### C. LGU report routing → Staff action → Citizen tracking

1. Super Admin visits `/admin/reports`, opens the submitted case, and changes `SUBMITTED` → `UNDER_REVIEW` with a meaningful citizen-facing note.
2. Set the priority (Low/Normal/High/Urgent), route to the same office as your test staff account, and choose an individual officer **or leave it unclaimed in the department queue**. Record an internal routing note when appropriate.
3. Staff logs in, opens `/admin` → **My Workspace**, and checks the relevant lists. If the case is in the unclaimed office queue, use **Claim this case**. Otherwise, open the case assigned by Super Admin.
4. The assigned staff member updates `UNDER_REVIEW` → `IN_PROGRESS` with an action note. Then updates `IN_PROGRESS` → `RESOLVED`, recording the outcome.
5. The citizen reloads `/reports/[id]` and `/track` and sees the updated **status and public timeline**. Internal notes and other citizens' contact details must never appear there.
6. Try opening a different department's report as staff, or calling its update API: access must be rejected. Only Super Admin has municipality-wide case control.
7. Optionally test **Revoke Access** from Super Admin: unresolved cases of that employee go back into the office queue. Closed cases retain historical officer/accountability records.

## Troubleshooting

| Symptom | Check first |
|---|---|
| `PrismaClientValidationError` when creating staff invitations | Confirm the **V6 invitations route and helper** are present (no `...input` spread into Prisma). Stop dev server; run `npx prisma generate`; restart. |
| `staff_invitation` / `staff_permission` / `civic_report` table missing | Run `npx prisma migrate status` and then `npx prisma migrate deploy`. Check the *same* `DATABASE_URL` used by Next.js and Prisma. Do not reset data. |
| `POST ... 503` without useful detail | Look for the **first underlying exception** in VS Code terminal; verify the entire error name and DB connection. The route intentionally does not print private SQL inputs or passwords. |
| No activation link after invite | Demo mode requires `STAFF_INVITE_DEMO_LINKS=true`, `NODE_ENV=development`, and a restart. The URL is shown only immediately after the invite or resend action. |
| Staff sees no cases | Check that staff has `REPORTS` permission and department equals the case's `assignedOffice`; cases assigned to another officer are not in their scope. |
| Next.js `runtime` conflicts with `cacheComponents` | The V6 invitation and activation routes have no `export const runtime` declarations. Clear `.next` if necessary and restart. |
| Stale UI after update | Stop dev server, optionally delete `.next`, restart `npm run dev`, and reload the browser. |

## Validation limits and readiness

- This working environment can execute pure Node/TypeScript-transpiled tests and scan TS/TSX syntax, but **cannot complete a real Next.js build or connect to your MySQL installation**. The downloaded project must be validated using the commands and smoke-test flow above.
- Civic Reporting, staff invitations, and role restrictions are implemented in code, **not yet verified end-to-end against the user's live database and browser**.
- Online LGU Services, Emergency Alerts, Municipal Projects, Job Matching, and Worker Census remain marked as **planned/previews**, not working backend modules. Permissions are in place for future implementation.
- This is a hackathon prototype; production use requires security review, privacy review, operational logging/monitoring, reliable email configuration, backups and recovery procedures.
