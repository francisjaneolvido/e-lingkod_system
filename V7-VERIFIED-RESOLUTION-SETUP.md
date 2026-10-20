# eLingkod Bayan V7 — Staff Proof + Super Admin Resolution Verification

Built on the V6 integrated project, with the previous sticky Save Case Update UI fix included.

## What changed

1. LGU Staff cannot mark a case Resolved using the ordinary status dropdown.
2. Only the officer assigned to an **In Progress** report can upload 1–3 proof photos plus 20–1500 characters of resolution remarks.
3. Submission moves the case into **Pending Verification**, not Resolved.
4. Super Admin sees the remarks/photo proof and either:
   - **Approve & resolve**: the case becomes **Resolved**, and the reporting citizen sees approved remarks and photos.
   - **Return for rework**: the case goes back to **In Progress**, with the reason visible only in the authorized LGU workspace. Staff may resubmit proof.
5. The timeline records each status transition and who acted. The proof record captures the submitter, reviewer, decision and timestamp.
6. Anonymous `/track` shows the progress stage, office, and a prompt to sign in for verified evidence once approved; it does **not** expose citizen details or photo files.
7. Resolution photos are a separate, access-controlled database table, not mixed with the citizen's original report photos. Photo contents are re-encoded to JPEG to strip EXIF/GPS metadata.

## Installation: use the PATCH ZIP if already on V6

**Back up your project folder and MySQL database first.** Stop `npm run dev`.

1. Extract `e-lingkod-bayan-v7-verification-patch.zip`.
2. Copy the contained `src`, `prisma`, `tests` folders (and this guide) into `C:\e-lingkod-bayan`, merging folders and replacing files.
3. Retain your existing `.env`, MySQL user records, and existing project data.
4. Start MySQL (for example, through XAMPP).
5. Run from your project folder in PowerShell:

```powershell
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:all
npm run dev
```

**Do not run `prisma migrate reset`** — it deletes records. If migration fails, save the actual error and diagnose the target database, schema or permissions without resetting it.

A new, additive migration is included: `20261021000000_resolution_verification`. It extends the existing Civic Report status enums and creates `resolution_submission` and `resolution_proof_photo` tables. It does not clear the existing `civic_report`, `report_photo`, or `report_update` tables.

**Important:** Prisma's generated client from V6 is outdated. `npx prisma generate` is mandatory *after* the new migration/schema is present and *before* restarting the app. The complete project ZIP intentionally omits generated code and must also run Prisma generate.

## Test the full three-role flow

1. **Citizen:** Use a citizen account (NOT the Super Admin) to submit a new dummy report with an initial photo. Copy its Tracking ID.
2. **Super Admin:** Open Admin → Citizen Reports. Set priority, choose a responsible office with an active REPORTS-authorized staff account, select the officer, and move Submitted → Under Review → In Progress with professional remarks.
3. **Assigned LGU Staff:** Sign in as that officer. Open the assigned report. In the `Photo proof & approval` section, add 1–3 real or simulated after-repair photos (JPG/PNG/WebP, at most 3 MB each), and submit specific resolution remarks. The case must now read **Pending Verification**.
4. **Super Admin:** Reopen the case to review the evidence and press either:
   - `Approve & resolve` to reach Resolved; or
   - `Return for rework` with a reason of at least 10 characters. The case must return to In Progress so the same officer can submit corrected proof.
5. **Citizen:** Public `/track` should show the approved status, with a sign-in prompt when verified photo evidence is available. Sign in to the original citizen account → My Reports → open the report. The **LGU-verified proof of resolution** section should show approval remarks and photos.
6. **Security:** As a different citizen, try the protected proof-photo URL. It must not load. A regular LGU Staff account from another office must not see the case or proof. An unapproved proof must not appear on the citizen page or anonymous tracking page.
7. **Double-save/concurrency:** Try using an old report tab after approval. It should show an update conflict instead of overwriting the status.

## Important boundaries

- Existing cases which were marked `RESOLVED` in V6 remain resolved. Proof is required for **future staff resolution submissions** using this workflow; prior cases are not retroactively assigned photo proof.
- A claim from a revoked staff member cannot be used to upload new proof. If an officer is reassigned or revoked while an approval is pending, the Super Admin can still review the already-submitted evidence; if returned, the case may need a new officer assigned.
- This is a source patch, **not a verified deployment**. The available test environment passed the validation tests and source syntax checks, but did not run your actual Windows + MySQL migrations, Next.js full build, or browser photo upload. Test all steps locally before a hackathon demonstration.
- Only upload demo photos you have permission to use. Strip or avoid faces, ID cards, and other personal information in public-facing resolution proof.
