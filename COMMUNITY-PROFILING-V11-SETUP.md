# Community Employment, Skills, Training, Livelihood & Census — V11

This update converts the previous citizen job-profile concept into a broader **Community Employment & Livelihood Survey** and adds a public privacy-safe census plus government historical-data import tools.

## What was added

- Citizen route: `/community-survey`
  - 7-step adaptive survey
  - only core profile + at least one skill + consent are required
  - employment/livelihood, training, barriers, business, and SDG 16 sections are optional
  - save draft and update later
- Public route: `/community-census`
  - no login required
  - respondent-based employment, skills, training, barrier, business and SDG 16 indicators
  - public small-group suppression: categories under 5 records are hidden
  - filters by barangay, employment status, education, age group, source, and year
- Admin route: `/admin/census`
  - citizen survey + historical government analytics
  - source-separated counts
  - training needs, skills, barriers, business sectors, SDG 16 indicators and yearly participation
  - privacy-safe aggregate CSV export
- Admin route: `/admin/census/imports`
  - CSV and XLSX first-sheet import
  - flexible column mapping
  - preview before commit
  - normalization warnings and duplicate reference signals
  - source/activity metadata and intended-use controls
  - manual historical record encoding for paper-only activities
  - import history and quality summary
- Opportunities remain informational only. The citizen survey can optionally power private opportunity recommendations, but it never submits a job application or sends a citizen profile to employers.

## Database migration

This update is additive and does not reset existing tables.

After extracting/opening the project:

```powershell
npm install
npm run db:migrate
npm run dev
```

`npm install` now runs `prisma generate` automatically through `postinstall`.

If you want to run generation manually:

```powershell
npm run db:generate
```

The new migration is:

`prisma/migrations/20261022113000_community_employment_profiling/migration.sql`

## Existing database data

The migration does **not** delete the existing `JobseekerProfile`, SPES, civic reporting, authentication, staff, or opportunity records. The old `/opportunities/profile` route now redirects citizens to `/community-survey`.

## Import privacy rule

Historical import mapping intentionally focuses on analytical fields. Names, email addresses, phone numbers, exact addresses and government ID columns should stay mapped to **Ignore column**. If a source has a non-identifying participant/reference code, it can be mapped for duplicate review.

Historical records only appear on the public census when the admin explicitly chooses **Public aggregated statistics** for that government activity. Individual records are never public.

## Suggested first test

1. Sign in as a Citizen.
2. Open `/community-survey`.
3. Complete the core profile and skills, then submit with aggregated-statistics consent.
4. Open `/community-census` and confirm the public totals update.
5. Sign in as an Admin or staff member with the `CENSUS` permission.
6. Open `/admin/census`.
7. Open `/admin/census/imports` and test `public/templates/community-training-needs-template.csv`.

Because public category counts under 5 are suppressed, a one-person test response may affect overview totals without appearing in detailed public breakdowns. This is expected.
