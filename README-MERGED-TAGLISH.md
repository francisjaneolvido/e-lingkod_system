# E-Lingkod Bayan — Combined System (Census + Municipal Projects & Services)

**Base project:** `e-lingkod_systemm.rar` (contains protected Census records, imports, analytics, opportunity workflows and current Online LGU Services).

**Municipal Projects source:** `e-lingkod-bayann(20261026-101819).rar` (contains Municipal Projects & Services, public project listings, official office directory, project approval workflow, and project-related API routes).

The merge is intentionally **additive**: newer Census / Establishment / Service Pickup functionality from the base project is preserved. Projects modules, migrations and supporting assets were added without replacing the full database schema, services, or census files.

## Before running locally (Windows / VS Code)

1. Extract the whole ZIP to a new folder. Keep your ORIGINAL projects and MySQL database as backups.
2. Open this combined project in VS Code; open the terminal in its root folder (where `package.json` is located).
3. Create `.env` from `.env.example`. Restore your **own existing** `DATABASE_URL`, `BETTER_AUTH_SECRET`, and other local configuration values. No actual credentials were included in this ZIP. Do **not** replace your live `.env` without backing it up.
4. Install packages and regenerate the Prisma client:

   ```powershell
   npm ci
   npm run db:generate
   ```

5. **BACK UP the MySQL database first**, then apply the database migrations (especially the three new Municipal Projects migrations):

   ```powershell
   npm run db:migrate
   ```

6. Start the system:

   ```powershell
   npm run dev
   ```

`npm run dev` and `npm run build` now automatically run **Prisma generate** before starting/compiling, to avoid errors like `Cannot read properties of undefined (reading 'findMany')` from an outdated Prisma Client.

**Important:** The Prisma files inside `src/generated/prisma` are a previously generated snapshot and **must be regenerated against the merged Prisma schema**. The archive does not contain `node_modules`, any live database, or private `.env` credentials.

## Where to verify the functionality

| Feature | Public / Admin path |
| --- | --- |
| Municipal Projects & Services directory | `/projects` |
| Admin Municipal Projects desk | `/admin/projects` |
| Online LGU Services | `/services` |
| Staff service requests and catalog | `/admin/services` |
| Protected Census records | `/admin/census` |
| Census imports | `/admin/census/imports` |
| Census / workforce analytics | `/admin/census/analytics` |
| Job / opportunities module | `/admin/jobs` |
| Civic reporting | `/admin/reports` |
| Emergency & Alerts | `/admin/emergency` |

Admin accounts can manage projects. Staff need the **PROJECTS** module permission; Census remains scoped by **CENSUS** permissions. Project entries are not published until Admin approval. Newly installed Projects tables do not contain official projects by default. Create a project draft and approve it in Admin to test publication. Sample projects are only available via the separate, explicitly opt-in local demo mechanism and must not be confused with verified LGU data.

## Added during the merge

- Project administration, public page, secure API endpoints, project forms and milestones, official office-directory validation and proposals
- Prisma models `MunicipalProject`, `MunicipalProjectUpdate`, `MunicipalOfficeDirectoryEntry`, `MunicipalOfficeDirectoryProposal`, and the necessary User relations
- Three additive migrations: `20261023220000_municipal_projects_v1`, `20261023234000_municipal_projects_transparency_v2`, `20261024000000_municipal_projects_demo_media`
- Optional local demo-image assets and scripts; source project tests
- Enabled navigation cards/links for Municipal Projects and existing Census
- Corrected a nullable `sourceUrl` rendering error in `project-console.tsx`

## Verification / limitations

- **21/21 Municipal Projects focused static tests passed.**
- **34 Census/Online LGU Services static and regression checks passed**, with seven tests skipped by their own environment conditions. One Census-import test could not be executed because third-party packages (including `@prisma/adapter-mariadb`) are not installed in this sandbox.
- The full Next.js build, complete TypeScript typecheck and a live MySQL migration/UI test could **not** be run in this environment because dependencies and MySQL are unavailable. Do not treat this package as production-verified until the commands above, `npm run typecheck`, `npm run build`, and an end-to-end browser test pass on your computer.
- For safety, no existing Census or Services migrations/tables were dropped or rewritten. Apply new migrations to a backed-up/test database first.

## Troubleshooting

**`Cannot read properties of undefined (reading 'findMany')` in Municipal Projects:** run `npm run db:generate`, restart the dev server, then run `npm run db:migrate` if the tables are still missing. Verify that you are running the **combined folder**, not the old archive's folder.

**`Table municipal_project doesn't exist` / `municipal_office_directory doesn't exist`:** connect to the intended MySQL database and run `npm run db:migrate`. Check `DATABASE_URL` without sharing passwords.

**No projects shown on the public page:** only Admin-published project records appear there; a fresh database initially has none.

**Census or Projects denied:** verify login role, module permissions and census-specific record access scope. Do not bypass access controls.
