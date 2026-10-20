# eLingkod Bayan V10 — PESO / Job Matching

This update is based on `e-lingkod-bayann(5).rar` (V9 Civic Reporting preserved).

## What is functional in the V10 source

**PESO / Super Admin**: `/admin/jobs` — separate `JOBS` permission, create/edit/publish/archive local job listings, search listings, consent-filtered SPES CSV import, import history, anonymous skills/area and skill-overlap insights.

**Citizen/Guest**: `/opportunities` — published non-expired listings, filter/search, job details, listed requirements, official inquiry instructions, and optional external link.

**Citizen**: `/opportunities/profile` — create/update/delete optional private skills and preferences; suggestions rank by skill/interest overlaps plus area and availability. No personal data is shared with employers.

**Not provided:** CV upload, direct job applications, automated hiring decisions, employer accounts, individual SPES respondent matching, live vacancy verification, sending emails or notifications. Employer names and opportunities must be entered and checked by PESO; no real vacancies are seeded.

## Install on your existing Windows project

1. Back up `C:\e-lingkod-bayan` and export your MySQL database before changing files.
2. Stop `npm run dev`.
3. Extract **V10 Update Patch** into `C:\e-lingkod-bayan` and choose *Replace files in destination* for matching files. Keep the existing `.env`, personal passwords, uploaded report photos, and database intact.
4. Start MySQL (XAMPP), then from PowerShell in `C:\e-lingkod-bayan`:

```powershell
npm install
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:all
npm run dev
```

5. Open `http://localhost:3000/admin/jobs` as Super Admin or an activated **PESO staff account with JOBS permission**.
6. Open `http://localhost:3000/opportunities` as guest/citizen and `/opportunities/profile` as a registered citizen.

**Important:** New migration `20261021020000_job_matching` is additive. Do **not** run `prisma migrate reset`. You **must** run `npx prisma generate` because the current generated client only knows V9 models. Stop if `migrate deploy` reports errors and save the full terminal message before retrying.

## Guided end-to-end test

1. Super Admin invites/assigns a PESO staff member to `JOBS` only. Sign in as that staff member in another browser. Confirm they can access `/admin/jobs` but not `/admin/staff` or `/admin/reports` without permission.
2. PESO staff selects **Add opportunity**, enters a *fictional* employer and job details, selects skills/interests and saves a Draft. It must **not** appear on `/opportunities` yet.
3. PESO staff clicks **Publish**. Confirm the listing appears in Citizen Job Discovery. Try search by job title, barangay, and skill; test sector/work-type filters.
4. Citizen logs in, opens **Create optional skills profile**, selects skills, interests, work type and area, then saves. Return to opportunities: relevant jobs should move upward and display skill overlap and missing skills. View public job details. Do not claim this guarantees eligibility or placement.
5. PESO staff imports `demo-data/spes-demo-consented.csv` using the **SPES CSV import** tab (label: `Hackathon fictional consented demo`). Verify counts and **Workforce insights**. All five rows are fictional — do not upload actual identifying data for the demo.
6. Import a CSV with an email/name column: expected **rejected**. Import one with `consent=NO`: expected **rejected** and zero rows written from that import.
7. PESO staff edits a published job: returns to **Draft** for review. Re-publish explicitly, then Archive. Confirm archived/expired opportunities disappear from Citizen Job Discovery.
8. Citizen deletes personal matching profile: listings remain public but no personalized ranking is shown. Confirm citizen cannot call PESO-only APIs and staff cannot overwrite a citizen profile using a staff account.
9. Re-test Civic Reporting: Citizen submit → Super Admin assign → Staff proof → Admin approve → Citizen feedback. V10 creates separate tables and should not affect V9 cases.

## Sample SPES CSV format

Header MUST be exactly:

```csv
consent,barangay,education,skills,interests,availability
YES,Poblacion,SENIOR_HIGH,Data entry|Microsoft Excel,Office & admin,PART_TIME
```

* The `consent` cell must be YES **for each row**. Consent must be obtained before uploading genuine survey data and cover this use for workforce insights.
* Do not include names, phone numbers, emails, respondent IDs, birthdates, specific residential addresses or free-text identifying notes. Upload with an unauthorized extra column is rejected.
* Supported education values: ELEMENTARY, HIGH_SCHOOL, SENIOR_HIGH, VOCATIONAL, COLLEGE.
* Availability values: ANY, FULL_TIME, PART_TIME, TEMPORARY, INTERNSHIP.
* Skill and interest labels must match the predefined choices in the V10 UI. Multiple values are separated by `|`.
* Max 500 rows / 300 KB per CSV. Entire upload is rejected if a row lacks consent or contains an invalid value; imports are all-or-nothing.
* Published jobs and anonymous aggregated SPES records stay separate from registered citizen user accounts. Survey respondent profiles are never automatically created and are not disclosed to employers.

## Privacy and matching interpretation

* Citizen profiles are opt-in. They store selected skills, interests, education, preferred area and availability, NOT CVs, phones or demographic data. They can be deleted using the profile page.
* Job matching is a **rule-based ranking** of public opportunities: skill overlap up to 60 points, interest overlap up to 20, schedule overlap 10, and exact preferred area overlap 10. This ranking is not an eligibility assessment, hiring score or guarantee. Citizens should check all requirements and apply using the employer's own official instructions.
* SPES signals in the PESO view count survey rows with >=1 required skill and compatible availability. Counts below three are not displayed exactly. Only LGU personnel with `JOBS` permission can view these aggregate insights.
* This prototype has no automated vacancy validation. Publish only employers and vacancies independently verified by PESO, especially before public deployment. Use fictional survey data in your hackathon demonstration.

## Verification limits

Local source syntax/import checks and `node --test` validation passed in the development environment. A full Next.js build, migration against *your* MySQL server, browser automation, and real employer/SPES integration were **not** verified here due to unavailable complete npm dependencies and local database. Test the full workflow on your PC. If Prisma or build fails, share exact terminal output without secrets; do not reset the database.
