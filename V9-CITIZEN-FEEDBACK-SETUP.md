# eLingkod Bayan V9 — Citizen Feedback & Reopen Case

Based on the V8 source, this patch preserves existing approved proof, audit trails, registered citizens, and staff access.

## Included
- New citizen confirmation actions at **My Reports → Report Details**, after Super Admin approves a resolution.
- **Confirm resolved:** keeps status `RESOLVED`; adds a timestamped citizen confirmation to the audit history.
- **Still not resolved:** requires a 20–1500-character explanation, allows 0–3 additional photos, and moves the report to `REOPENED` pending Super Admin review.
- Super Admin can view the reason and optional private photos in the same case detail page, re-route and move the case to `UNDER_REVIEW` (with a remark). Assigned LGU staff cannot re-route a reopened case before review.
- Historical proof remains accessible to the authenticated owner, even while the case is reopened. Anonymous tracking shows the reopened status but no names, remarks, or evidence.
- After Super Admin re-triages the case, the normal workflow continues: `UNDER_REVIEW → IN_PROGRESS → PENDING_VERIFICATION → RESOLVED` (new proof package + admin approval). The citizen can respond to each **newly approved** resolution once.

## Install (existing working V8 project)
1. Back up `C:\e-lingkod-bayan` AND the MySQL database first.
2. Stop the Next.js dev server (`Ctrl+C`).
3. Extract `e-lingkod-bayan-v9-feedback-patch.zip` and copy the contents of `src`, `prisma`, and `tests` into your project folder. Merge/replace matching files. **Do not overwrite `.env`.**
4. Make sure MySQL in XAMPP is running. In PowerShell inside your project:

```powershell
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:all
npm run dev
```

5. Open `http://localhost:3000/reports` using the citizen who originally submitted a report.

If using the **complete V9 source** in a fresh folder, copy your own `.env` securely and run `npm install` before these commands. Generated Prisma files are intentionally not included in the full source archive: always run `npx prisma generate` before `npm run dev`.

**Never run `prisma migrate reset` on a database with real accounts/reports.** If migration fails, stop and review its error before retrying. The V9 migration is additive.

## Recommended end-to-end test
1. With Citizen A, open a report with status **Resolved** and an actual approved V7/V8 proof-photo submission. Earlier legacy Resolved cases without approved photos cannot use V9 confirmation.
2. Verify `Confirm resolved` and `Still not resolved` buttons are visible without hovering.
3. For test case #1: click `Confirm resolved`. Refresh: report remains Resolved and the feedback history reads `Resolution confirmed`. Attempting to respond a second time must fail.
4. For a different **Resolved** case #2: click `Still not resolved`, enter 20+ characters, optionally upload a photo, then `Request another review`. It becomes **Reopened — awaiting review**.
5. Open public `/track` with the Tracking ID. Only generic status and office appear. No citizen reason or photos.
6. As Super Admin open `/admin/reports`; in the default Needs Review queue locate the reopened case. In case detail read the citizen's reason/evidence. Set status **Under review**, review/reassign office and officer, and enter an explanatory remark. Save.
7. As assigned Staff, advance Under Review → In Progress. Upload new resolution proof. As Super Admin approve it.
8. As Citizen A, confirm or dispute the **new** resolution. Old approval, prior citizen feedback, and timeline must remain available.
9. As Citizen B, attempt `/reports/<Citizen A report id>` and the protected feedback/photo URLs. Must return no private data. A Staff member from another department must also be blocked.

## Security / limitations
- Only the report's original signed-in owner can submit confirmation or dispute.
- Each approved proof package allows one citizen response; database unique key and optimistic version checking prevent duplicate/racing submissions.
- Extra citizen photos are re-encoded to JPEG without EXIF; max 3 photos, 3 MB each. Stored in MySQL with authenticated access checks.
- Additional photos are private and **never** served by the public tracking endpoint.
- Existing Resolved reports without a V7 verified proof package continue to appear as Resolved but do not show the citizen confirmation prompt.
- V9 does **not** automatically email or send push notifications to LGU Staff/Admin.
- Unit/static tests passed in the packaging environment, but full Next.js build, Prisma migration and live browser/MySQL end-to-end tests could not be confirmed there.
