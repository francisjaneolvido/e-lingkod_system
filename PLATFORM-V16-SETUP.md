# eLingkod Bayan V16 — Platform Workflow, Service Builder & Fair Staff Distribution

This patch is based on the V15 project and contains only files changed for V16.

## What V16 adds

### 1) Fair module-based staff distribution
For task-based modules that currently have assignable case work:

- Civic Reporting (`REPORTS`)
- Online LGU Services (`SERVICES`)

Super Admin normally routes work to the appropriate office/module instead of choosing an individual staff member every time.

The system then:
1. Finds eligible STAFF accounts with the correct module permission and department/office.
2. Chooses the staff member with the lowest active workload.
3. Uses recent offer history as a fairness tie-breaker.
4. Sends a work offer with an acceptance deadline.
5. Staff chooses **Accept work** or **Decline**.
6. A decline or expired offer is rebalanced to another eligible staff member.
7. A staff member already offered the same case is not offered it again in the same offer cycle.
8. If the eligible pool is exhausted, Super Admin is notified and can use manual assignment as the fallback.

Manual Super Admin assignment is intentionally preserved and is treated as immediately accepted work.

The generic `WorkAssignment` layer also includes future task types for Job Matching and Census, but V16 does not invent task queues where those modules do not yet have one. Job Opportunity verification keeps its existing author → Super Admin verification flow. Census remains unconfigured and empty.

### 2) Notifications Center
The bell now uses persisted notifications instead of mock UI state.

Examples:
- new work offer
- correction/action required
- citizen resubmission
- schedule options available
- schedule selected
- request ready for final verification
- ready for release/completed
- job opportunity submitted/approved/returned
- civic resolution updates

There is also `/notifications` for the full notification history.

### 3) Online Services polish
- Printable citizen request acknowledgement/summary
- Document preview/download links
- Service-specific citizen status labels
- Service analytics for Super Admin
- Request audit CSV export
- Staff workload indicators
- Auto-balanced assignment by service department
- Manual assignment override remains available

### 4) Service Management / Service Builder
Super Admin can open:

`/admin/services/catalog`

Configure:
- service name / category
- processing office and department aliases
- description
- direct vs pre-screen intake
- appointment mode (`NONE`, `OPTIONAL`, `INTERVIEW`, `INSPECTION`, `PICKUP`)
- completion mode
- fee/assessment note
- expected processing time
- automatic balanced assignment vs manual assignment
- staff acceptance timeout
- form questions
- conditional questions
- pre-screen questions
- validation rules
- document requirements
- conditional requirements
- review/processing checklist
- publish/unpublish

Existing services remain available as system defaults and can be customized without creating a new React page.

### 5) Dashboard improvements
Citizen dashboard includes:
- active Online LGU requests
- action required
- community profile status
- opportunity availability
- next confirmed LGU appointment

Staff workspace includes:
- work offers requiring Accept/Decline
- assigned service workload
- corrections
- schedules
- Job Matching work where applicable

Super Admin dashboard includes:
- unassigned/routing-needed service cases
- final verification
- aging cases
- distributed workload
- links to Community Pulse

### 6) Community Pulse
Super Admin:

`/admin/pulse`

Shows aggregate operational signals only:
- Civic Reports
- Online LGU Services
- Job Matching / opportunities
- employment survey activity
- active staff workload
- registered citizen count

Census is clearly shown as **Not configured** and no other module is treated as Census data.

### 7) Census remains separate
`/admin/census` remains a planning/readiness screen only.

It explicitly has:
- no questionnaire
- no respondents
- no public Census statistics

Employment survey, Civic Reporting and Online Services data are not Census records.

## Database setup

V16 has an additive migration:

`prisma/migrations/20261022230000_platform_workflow_v16/migration.sql`

It adds workflow/notification/service-definition tables. It does not reset existing data.

After copying the patch into the project root:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Recommended Staff 1 / Staff 2 fairness test

1. Create/prepare Staff 1 and Staff 2.
2. Give both the same module permission, e.g. `REPORTS`.
3. Make sure both use the same responsible department/office.
4. Route a Civic Report to that office **without selecting a specific officer**.
5. One eligible staff member should receive a work offer.
6. That staff member should see **Accept work / Decline** and an expiry time.
7. Decline the offer.
8. The case should be offered to the other eligible staff member.
9. For a separate new case, active workload + recent offer history should influence the next fair selection.
10. If all eligible staff decline/expire, Super Admin should receive a notification that manual assignment is needed.
11. Confirm that Super Admin can still manually assign/reassign a case.

Repeat the same concept with Online LGU Services using staff with `SERVICES` permission and matching service department.

## Online Services test routes

- Citizen catalog: `/services`
- Citizen requests: `/services/requests`
- Admin/staff service desk: `/admin/services`
- Service Builder: `/admin/services/catalog`
- Service Analytics: `/admin/services/reports`
- Notifications: `/notifications`
- Community Pulse: `/admin/pulse`

## Regression tests

V16 source regression suite result while packaging:

- **136 tests**
- **136 passed**
- **0 failed**

Run locally with:

```powershell
npm run test:all
```

Then also run locally after installing dependencies:

```powershell
npm run typecheck
npm run lint
npm run build
```

Exact production requirements, fees and processing times should still be aligned with the municipality's approved Citizen's Charter before deployment.
