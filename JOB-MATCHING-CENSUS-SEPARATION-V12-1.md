# Job Matching / Census Separation — V12.1

This correction separates the live Job Matching / Employment & Livelihood features from the future Census module.

## Live Job Matching features
- Employment & livelihood survey: `/community-survey`
- Public employment & skills insights: `/community-employment/insights`
- Opportunities: `/opportunities`
- Admin Job Matching: `/admin/jobs`
- Admin employment insights: `/admin/jobs/insights`
- Admin historical/activity data management: `/admin/jobs/data`

## Census
- Public Census placeholder: `/community-census`
- Admin Census placeholder: `/admin/census`
- Census currently contains no employment survey analytics or imported employment datasets.

## Staff permissions
- `JOBS` — Job Matching, opportunity management, and employment insights
- `COMMUNITY_DATA` — historical/activity data imports and manual encoding for Job Matching
- `CENSUS` — separate planned Census module

No database reset or new migration is required for this routing/permission correction.

Verification: 109/109 source-based automated tests passed.
