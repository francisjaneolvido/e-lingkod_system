# eLingkod Bayan V8 — Case Workspace UI/UX Review

This update is based on the **e-lingkod-bayann(4).rar** upload. It preserves the existing Civic Reporting API, account roles, LGU office/staff assignment, photo proof records, and admin verification workflow.

## What changed

1. **Fixed invisible Save controls.** The Admin/Staff report-detail route did not inherit Civic CSS color variables from the Citizen page. The background of `.primary` could be transparent while its text stayed white. The Admin detail workspace now defines its own design tokens and explicit primary-button styling.
2. **One case workspace, two tabs.** Case Update and Proof & Approval no longer appear as two long vertically stacked cards. Pending Verification opens the Proof & Approval tab automatically. An officer's In Progress case also opens the Proof tab by default.
3. **Action dock.** The Case Update Save, Proof Submit, and Admin Approve/Return controls are fixed near the bottom of the viewport when the respective form/tab is active. At narrow widths the action dock spans the available screen width. It is not hover dependent.
4. **Progress Trail moved into report details.** The action area is no longer stretched by the report history. The timeline remains available to Admin, assigned LGU Staff, and Citizen according to server-supplied visibility.
5. **Readability and spacing.** Wider desktop action column, smaller header, more consistent form spacing, 12–14px working text, shorter help text, tidier attachments, and responsive single-column layout on smaller screens.
6. **Immediate proof-file checks.** 1–3 JPG/PNG/WebP files, maximum 3 MB each. These client checks supplement (do not replace) the API's validation.
7. **Existing eLingkod Bayan logo preserved.** The admin shell is shared across Super Admin and LGU Staff, with server-defined module access as before.

## Install into an existing V7 project

1. Back up your project folder and database. Stop the dev server (`Ctrl + C`).
2. Extract `e-lingkod-bayan-v8-case-ui-patch.zip`.
3. Copy its **src** and **tests** folders into `C:\e-lingkod-bayan`, merging/replacing corresponding files. No database files or private `.env` are included.
4. In `C:\e-lingkod-bayan` run:

```powershell
npm run test:all
npm run dev
```

If stale assets persist, stop the server, then run:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

**No Prisma schema/migration changes** were made for V8. Do **not** run `prisma migrate reset` for this UI update.

## Test the three roles

| Persona | Check | Expected outcome |
|---|---|---|
| Super Admin | Open `/admin/reports/[id]` for an active case | Details at left, office summary/action workspace at right on desktop; Save button visible without hover |
| Super Admin | Route the report and add a public note | Case Update saves; the activity timeline records the change |
| LGU Staff | Open assigned In Progress case | Proof tab defaults open; photo picker and Submit for verification are visible |
| LGU Staff | Upload 4 photos, incorrect type, or a file over 3 MB | Immediate client-side validation error without submitting |
| LGU Staff | Submit 1–3 valid proof photos with remarks | Status becomes Pending Verification after successful API call |
| Super Admin | Open that Pending Verification case | Proof & Approval tab opens; inspect evidence, approve or return with an internal note |
| Citizen | Open My Reports and original Tracking ID | Citizen sees status and authorized/public progress notes, and approved resolution proof on signed-in details |
| Unauthorized account | Attempt another department's case URL | Server authorization must reject access as in V7 |
| Narrow/mobile view | Open case detail | Action workspace appears before long evidence; controls remain within viewport, no horizontal scroll |

Only the workflow controls were restructured. The administrative approval rules, report status transitions, photo authorization, and role checks remain owned by the existing backend.

## Validation performed in this workspace

- 34/34 Node validation/regression tests passed (existing 29 and new 5 UI guard tests).
- 133 `.ts`/`.tsx`/`.js` source files transpiled without syntax errors.
- Both edited CSS files parsed successfully.
- A representative static browser layout was checked at 1366px, 780px, and 390px widths. The fixed Save control was within the viewport without hover, and no horizontal overflow was observed.

**Limitations:** Full Next.js compilation and local MySQL/browser end-to-end transactions were not run here because the extracted project did not include installed dependencies or your database. The static browser check uses representative markup, not the live Next.js app. Test the actual flow locally before the hackathon.
