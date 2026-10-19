# eLingkod Bayan – Los Baños (ELB-LB)

An academic prototype of an **Integrated LGU Management & Citizen Services System**. The target MVP connects citizen reports and service requests to a small LGU dashboard, with public directories, municipal projects, worker census records, and deterministic job matching.

## Read this before setup

The repository already contains an application. At review on **20 October 2026**, it contained Next.js 16.4.2, React/React DOM 19.3.0, TypeScript, Tailwind CSS 4, shadcn/ui with a Base UI preset, landing sections, login/register forms, and MySQL/Prisma/Better Auth integration code. These observations come from source and package inspection, not a successful runtime test. The previous README's frontend-only description no longer matched all the source files.

The approved backend is **Supabase PostgreSQL, Auth, and Storage**. The source has **not** been converted by this documentation task. Follow the [existing-project migration checkpoint](docs/02-installation-and-environment-setup.md#existing-project-migration-checkpoint) before treating Supabase setup as complete. Do not scaffold over this checkout or combine the old MySQL setup with the new plan.

## Objectives and feature ownership

Each developer owns the interface, validation, server operations, data changes, and tests for their two modules.

| Owner | Module | Demonstration outcome |
| --- | --- | --- |
| Developer 1 — blue | Civic Reporting | Submit category, description, optional photo, and GPS/manual location; receive a tracking ID; view history; let staff update status. |
| Developer 1 — blue | Emergency Hotlines and Alerts | Browse PNP, BFP, hospital, and MDRRMO categories; call only independently verified numbers. Alerts are optional. |
| Developer 2 — green | Online LGU Services | Submit a reusable service form, receive a reference, view history, and let staff review/update status. |
| Developer 2 — green | Municipal Projects and Services | Browse offices, contacts, services, and upcoming/ongoing/completed projects. |
| Developer 3 — pink | Worker Census and Social Profiling | Manage synthetic worker records behind staff access; import a small sample; show aggregates. |
| Developer 3 — pink | Job Matching | Browse/filter jobs and let authorized staff match a census worker using occupation, skills, and barangay. |

Shared objectives are ownership-based access, persistent records, usable mobile forms, and a repeatable demonstration. Matching reuses census data without exposing individual socioeconomic records.

## Approved stack

| Layer | Technology |
| --- | --- |
| Application | Next.js App Router, React, TypeScript; one modular application |
| UI | Tailwind CSS and the existing shadcn/ui components |
| Backend | Next.js Server Actions and Route Handlers |
| Database, identity, files | Supabase PostgreSQL, Supabase Auth, Supabase Storage |
| Map and location | Leaflet, React Leaflet, OpenStreetMap; browser GPS with manual fallback |
| Hosting and collaboration | Vercel, Supabase, Git, GitHub |
| Optional after core acceptance | Supabase Realtime, Web Push, email notifications, Supabase Cron |

Use Windows 10/11 and PowerShell, **Node.js 24 LTS** with bundled npm, Git for Windows, an existing IDE, and GitHub/Supabase/Vercel accounts. The target workflow does not need local PostgreSQL, MySQL, Docker, or the Supabase CLI. Versions and free-tier limits are covered in [prerequisites](docs/01-prerequisites.md).

## Documentation and reading order

| Order | Guide | Use it for |
| --- | --- | --- |
| 1 | [Prerequisites](docs/01-prerequisites.md) | Tools, accounts, dependency compatibility, optional services |
| 2 | [Installation and environment setup](docs/02-installation-and-environment-setup.md) | Windows setup, migration checkpoint, Supabase, maps, Vercel |
| 3 | [Architecture and collaboration](docs/03-project-architecture.md) | Routes, entities, security, module contracts, branches, migrations, reviews |
| 4 | [Development phase](docs/04-development-phase.md) | Concurrent work breakdown and development flowchart |
| 5 | [Testing phase](docs/05-testing-phase.md) | Test procedures, access checks, defects, testing flowchart |
| 6 | [Seven-day schedule](docs/06-seven-day-schedule.md) | Daily work, completion gates, fallbacks, demo |
| As needed | [Troubleshooting](docs/07-troubleshooting.md) | Setup, build, Git, identity, storage, maps, hosting failures |

Read guides 1–3 together on Day 1. Use the schedule to control scope and the development/testing guides as acceptance checklists.

## Working agreement

1. Complete the Day 1 environment and Supabase authentication checkpoint. Preserve the existing landing UI and brand assets.
2. Agree on fields, roles, statuses, route ownership, and file policies before parallel changes.
3. Use short feature branches, small pull requests, and daily integration from Day 2.
4. Before merging, run the existing lint, typecheck, and build scripts; verify a successful action, rejected input, and relevant access rules. Record results in the PR.
5. Freeze features on Day 4. Reserve Days 5–7 for integration, testing, deployment checks, and demonstration.

Commands in these guides are for the development team to execute later. This documentation task did not install packages, change application code, run application tests, or deploy anything.

## MVP scope and limitations

All six features need a small working demonstration. P0 covers persistent core workflows and security; P1 covers directories, filtering, and sample import. P2 enhancements must not consume the testing window.

The MVP does not issue permits, collect payments, dispatch responders, perform hiring transactions, or use AI matching. It has no municipal endorsement or verified operational SLA. Use synthetic data and label illustrative content. Unverified hotline entries remain non-callable; do not invent numbers.

The existing [brand/UI guide](BRAND-AND-UI-GUIDE.txt) remains useful: retain the eLB mark, Poppins, navy/gold palette, responsive layouts, and honest demo labels. Landing images are illustrations, not records of government activities. Preserve the fixed-year footer handling until the team verifies an alternative with the current cache configuration.

Historical material remains available: [MySQL authentication setup](SETUP-MYSQL-AUTH.md), [earlier starting notes](START-HERE.txt), [services patch notes](READ-ME-FIRST.txt), [replacement instructions](REPLACE-FILES-ONLY-README.txt), and [old checklist](CHECKLIST.txt). Their ZIP replacement and MySQL instructions describe earlier iterations and do not define the approved Supabase path.
