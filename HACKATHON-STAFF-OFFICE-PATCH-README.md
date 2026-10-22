# eLingkod Bayan — LGU office & Staff assignment patch

**Patch only:** this ZIP contains the files changed for Admin/Staff workflow and related automated tests. It is NOT a full Next.js project; it does not contain `.env`, `node_modules`, the database, or any credential values.

## Install (Windows PowerShell)

1. **Back up your project folder** and stop `npm run dev`.
2. Save `e-lingkod-bayan-staff-office-patch.zip` to Downloads.
3. Paste in PowerShell:

```powershell
cd C:\e-lingkod-bayan
Expand-Archive -LiteralPath "$HOME\Downloads\e-lingkod-bayan-staff-office-patch.zip" -DestinationPath "C:\e-lingkod-bayan" -Force
npm run test:all
npm run dev
```

The archive starts with `src/`, `scripts/`, `tests/`, and this README at project root. `-Force` overwrites only the included paths. **Do not extract it into an extra nested project folder.** No database migration is necessary.

## Why the current demo Staff does NOT show in Assignment override

The Service Request Desk does not show ALL staff who have checkbox access. The server restricts the assignment dropdown to:

- Active account with `role = STAFF`;
- `SERVICES` module granted;
- Staff department matches the requested service's processing office or recognized alias.

Your demo Staff's department is **Municipal Office**, while the **Business Clearance / Certification** request is processed by **Business Permits and Licensing Office (BPLO)**. Even with seven modules granted, that generic office name is not eligible. This is deliberate so a member of an unrelated office cannot receive sensitive requests.

### Fix the existing seeded Staff account

1. Log in as Admin. Open `/admin/staff` → **Staff directory** → **Manage access** beside demo Staff.
2. Set **Department / office** to **Business Permits and Licensing Office (BPLO)**.
3. Ensure **Online LGU Services** (`SERVICES`) remains selected. The **Use suggested modules** button is optional and would replace the checked selection with BPLO's proposed modules (which is just `SERVICES`); leave your existing modules checked if your demo needs them.
4. Click **Save permissions**.
5. Reopen or refresh the Business Clearance request. The BPLO Staff will now appear in **Assignment override**. Assign/reassign the existing submitted request manually if it had no eligible assignee when created.

**Important:** Running the demo seeder again will NOT modify an existing Staff account. Existing credentials and permissions are intentionally preserved. The included seeder uses BPLO as the default department only when it creates a *new* demo account, unless overridden with `STAFF_DEPARTMENT` in your `.env`.

## What changed

- **Curated dropdown:** 29 typical Philippine municipal LGU offices organized by type, in both **Staff directory editing**, **Assign existing account**, and **Invite new staff**. Existing legacy office values remain visible until updated; no database schema changes.
- **Role-aware setup:** per-office suggested module grants, with explicit **Use suggested modules** action. Suggestions NEVER auto-grant permissions.
- **Service Request Desk empty state:** clearly displays why no staff is eligible, shows the processing office, and links to Staff Management. Server still restricts assignments to eligible office + `SERVICES` module.
- **Civic Reports routing:** suggests MEO for roads/streetlights, MENRO for waste/environment, and GSO/MEO for public facilities. Only offices with REPORTS-enabled staff appear as assignable office choices. Admin makes final routing decisions.
- **Admin → Staff help:** guided 3-step workflow on Staff Management. Corrected staff module dashboard count and tab-panel accessibility IDs.
- **Safe role changes:** Admin cannot remove `SERVICES` access or change an officer's department while active Service Requests are still assigned to them. Reassign the open requests first, then save the staff changes.
- **Optional demo seeder tweak:** New demo Staff default is BPLO instead of the ambiguous `Municipal Office`; existing accounts are NOT changed.

## Proposed workflows

### Civic Reports
Citizen submits concern → Super Admin checks category and evidence → Super Admin chooses responsible office (suggestions only) → system offers work to REPORTS-enabled staff **in that office** → staff accepts, handles report and submits proof → Super Admin verifies resolution → citizen tracks outcome.

### Online LGU Services
Citizen submits Business Clearance → BPLO is responsible office → the system offers work to a BPLO Staff who has SERVICES access; alternatively Super Admin can manually assign → Staff reviews documents, requests corrections or records recommendation → Super Admin performs final review as needed → citizen receives updates.

### Staff management
Admin invites or assigns existing account → selects the correct office → reviews suggested modules and saves → Staff signs in, sees only authorized modules and eligible work → Admin can audit/access-manage; active service work must be reassigned before staff office/permission changes.

## Important limits

- Lists and role suggestions are generic demos. Real LGU organizational charts, Citizen's Charters and service ownership vary; configure for the actual LGU before production.
- Department/module permission checks remain server-side. This patch does **not** make every Staff eligible for every request.
- No database records were deleted or modified as part of generating this ZIP; actual running MySQL and browser interaction were not available here.
- Unit/source regression tests and the new LGU office tests were run. A full Next.js build/live-DB integration test was not performed in this environment.
- No new `package.json` command is needed for these changes; run `npm run test:all` using the existing project.

## Included paths

```
src/lib/lgu-offices.ts
src/components/admin/lgu-office-select.tsx
src/components/admin/staff-manager.tsx
src/components/admin/staff-invite-manager.tsx
src/components/admin/staff-management-workspace.tsx
src/features/services/components/admin-request-actions.tsx
src/features/civic/components/admin-update-form.tsx
src/app/api/admin/staff/route.ts
scripts/seed-demo-accounts.mjs
tests/lgu-staff-office-flow.test.mjs
HACKATHON-STAFF-OFFICE-PATCH-README.md
```
