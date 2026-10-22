# eLingkod Bayan — Document Pickup Scheduling Patch (Changed Files Only)

This patch is designed for the latest reviewed `e-lingkod-bayann(8)` project WITH the previous Staff Office patch. It does not contain the whole project, `.env`, credentials, or database records.

## Installation (PowerShell)

1. BACK UP your local project and database. Stop `npm run dev`.
2. Extract the ZIP into the root of `C:\e-lingkod-bayan`, preserving the `src/`, `prisma/`, and `tests/` folders.
3. From PowerShell inside that project:

```powershell
cd C:\e-lingkod-bayan
npm install
npm run db:migrate
npm run db:generate
npm run dev
```

Migration **adds only** a `service_pickup_slot` table; it does **not** drop, truncate, reseed, or clear your old data. Do NOT run `db:clear-data` for this patch.

For a smoke test, `npm run test:all` and `npm run typecheck` on your local development computer. If Prisma reports a pending migration, confirm your `.env` `DATABASE_URL` points to the intended dev database. Never run a migration against a live municipal database without backup/review.

## Supported built-in services

Pickup applies to Online LGU Services whose `completionMode` is `RELEASE` (including custom services configured to release physical documents): Business/Mayor's Permit, Building Permit, Certificate of Residency, and Business Clearance/Certification. Other assistance-only services stay `SERVICE` without automatic physical document pickup.

**Document pickup is separate from the existing interview/inspection appointments**; those workflows are unchanged.

## End-to-end workflow

1. Citizen submits request / uploads required documents.
2. Staff verifies, schedules an interview or inspection IF needed, then sends a recommendation.
3. Super Admin clicks **Approve for release**. Citizen is notified that the document is approved; assigned Staff gets a prompt to offer pickup dates.
4. Assigned processing-office Staff with `SERVICES` access and an accepted work assignment offers **2–5 future pickup options**, releasing location, and collection instructions.
5. Citizen opens `/services/requests/{id}`, chooses a slot, or asks for new dates with a reason. The citizen's existing tracking ID doubles as the printable pickup reference. No extra citizen account/ID is created.
6. Staff checks claimant ID and representative authorization if applicable, enters claimant name and release notes, then confirms **physical document released** at or after the confirmed pickup time.
7. Admin clicks **Verify completed**. History records who approved, offered dates, selected a time, and released the document.

## Status/permission notes

- Main request status remains `READY_FOR_RELEASE` while pickup slots are being offered/confirmed, preventing interference with pre-release scheduling and approval.
- Rescheduling cancels the previous offer/confirmation and reopens the option-creation action for staff.
- Citizens can see/modify pickup slots only on their own authenticated request; all writes validate it again on the server.
- A staff user must belong to the service's processing office, be assigned to the request, and have accepted the work assignment. Admin can offer pickup slots if needed.
- A release cannot be recorded before a citizen-confirmed pickup time or without identity verification acknowledgement and claimant information.
- Current tracking ID is the pickup reference; no QR rendering or scanner is included in this patch.
- Dates are displayed in `Asia/Manila`. Staff time input is interpreted as Philippine time regardless of the browser's timezone.
- There is no booking capacity cap across *different* requests (slots are per request); for production, add office-level appointment capacities/holidays and real identity-check process.

## Manual acceptance checklist

- Login as Admin -> approve a release-type request after staff recommendation.
- Login as responsible Office Staff -> **Document pickup scheduling** appears; propose 3 distinct future dates.
- Login as owning Citizen -> pick one option; office receives confirmation. Refresh views.
- Login as Citizen -> request alternative dates; assigned Staff sends new choices, Citizen confirms.
- Check claiming is unavailable until slot time, and ID checkbox and claimant name are required.
- At scheduled time record collection, login as Admin -> verify completed.
- Test a service with `completionMode = SERVICE`; it should NOT show pickup UI.
- Verify original interview/inspection scheduling still operates normally.

## Verification in this environment

Automated Node tests and TypeScript syntax-transpilation checks passed. A connected MySQL instance, generated Prisma Client build, browser login and full production build were not available here. Finish those checks locally after the migration.
