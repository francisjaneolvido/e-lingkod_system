# Community + Opportunities UX Flow V12

This update focuses on the Community Employment & Livelihood and Opportunity Management experience for citizens, LGU staff, and Super Admins.

## Citizen changes

- Community Survey is presented as a short **Quick Profile** first, followed by optional detail sections.
- Submitted users get a **My Community Profile** summary with employment, skills, training interest, and useful next actions.
- Public Community Census is split into focused tabs: Overview, Employment, Skills & Training, Livelihood, and Community Participation.
- Census wording clearly states that figures describe participating records, not an official population census.
- Opportunity browsing adds location, skills, and sorting filters.
- Personalized recommendations explain **why an opportunity may interest the citizen** without presenting an eligibility or hiring score.

## Staff and Super Admin changes

The Admin sidebar now groups Community Insights, Community Data, and Opportunities under **Employment & Livelihood**.

### Staff permissions

- `CENSUS` = **Community Insights** (view aggregated analytics)
- `COMMUNITY_DATA` = **Community Data Management** (historical imports/manual encoding)
- `JOBS` = **Opportunity Management**

`COMMUNITY_DATA` is additive and does not require a Prisma/database migration because staff module keys are stored as strings.

This allows a staff member to view community analytics without automatically being allowed to modify/import datasets.

### Community Insights

- Persistent filters for barangay, employment status, education, age group, source, and year.
- Focused tabs instead of one long dashboard.
- **Insights -> Action** signals surface training demand, barriers, and priority-program signals for human review.
- Data-source separation remains visible so citizen survey data and historical activity data are not misrepresented as the same collection method.

### Opportunity Management

The main Opportunity Management screen is now focused only on opportunity workflow.

Quick views include:
- My drafts / returned
- Returned to me
- Needs verification / awaiting verification
- Published
- Closed / archived
- All listings

Staff submit listings for verification; Super Admin handles the verification queue and publishing.

The old SPES import/insight workflow remains available at:

`/admin/jobs/legacy-spes`

New historical government activity data should normally be managed through Community Data Management.

## Important routes

Citizen/public:
- `/community-employment`
- `/community-survey`
- `/community-census`
- `/opportunities`

Admin/staff:
- `/admin/census`
- `/admin/census/imports`
- `/admin/jobs`
- `/admin/jobs/legacy-spes`

## Staff assignment recommendation

For a PESO/community staff member who manages everything in the Employment & Livelihood workspace, assign:

- Community Insights
- Community Data Management
- Opportunity Management

For an analyst who should only view community statistics, assign only:

- Community Insights

For a data encoder/import officer, assign:

- Community Data Management

Add Community Insights too only if they should also view the full analytics dashboard.

## Verification

Project source test suite after this update:

- 108 tests
- 108 passed
- 0 failed

No database reset is required for this UX/permission update.
