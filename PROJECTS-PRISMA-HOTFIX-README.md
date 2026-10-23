# E-Lingkod Bayan — Municipal Projects V2/V3 Prisma hotfix

**Base checked:** `e-lingkod-bayann(20261023-152938).rar` (Oct. 23, 2026).

## Root cause (confirmed from uploaded code)

In `src/app/admin/projects/page.tsx` and `src/app/projects/page.tsx`, the code calls `prisma.municipalOfficeDirectoryEntry.findMany()` and `prisma.municipalOfficeDirectoryProposal.findMany()`. But the uploaded `prisma/schema.prisma` and `src/generated/prisma` have **neither model**. That makes the delegate undefined at runtime.

The source also refers to **Municipal Projects V2** budget fields and **V3** demo/photo fields that are missing from `schema.prisma` and the uploaded generated client. The additive SQL migrations for V2 and V3 are already present in the uploaded RAR. The pages themselves already use `Promise.allSettled` for independent loading, so replacing them will not fix a missing Prisma delegate.

## Included files (changed/new only)

- `scripts/repair-projects-prisma.mjs` — validates and adds only missing Municipal Projects V2/V3 fields and both office models to your current local schema. No direct database connection or deletion. Rerunnable.
- `tests/municipal-projects-schema-repair.test.mjs` — tests dry-run, idempotence, preservation of non-Projects models and failure on partial schema.
- This README.

**Not included:** `prisma/schema.prisma` (to avoid overwriting teammates' Jobs/Survey/Census changes), `.env`, `.git`, generated client, and migrations (already in your RAR).

## Safe installation in PowerShell (project at C:\e-lingkod-bayan)

1. **Stop the Next.js dev server** with Ctrl+C. Back up both your project and DB before migrations.
2. Extract ZIP into the project directory, preserving paths (scripts/, tests/).
3. Back up the local schema separately and run the Projects-only repair:

```powershell
cd C:\e-lingkod-bayan
Copy-Item .\prisma\schema.prisma .\prisma\schema.prisma.pre-projects-hotfix.bak
node scripts/repair-projects-prisma.mjs --check
node scripts/repair-projects-prisma.mjs --apply
git diff -- prisma/schema.prisma
```

**Inspect the diff:** it should only add V2 and V3 fields to `model MunicipalProject`, plus the two `MunicipalOfficeDirectory*` models. Do not proceed if there are conflicts with your teammates' edits. The script also saves an additional original-schema backup to the Windows temp directory when it makes changes.

4. **Inspect migration status** to see whether the existing V1/V2/V3 SQL migrations have been applied:

```powershell
npx prisma migrate status
```

If the required Projects migrations are pending, check **all pending migration names** first. `npm run db:migrate` runs **every** pending migration, not just Projects migrations; coordinate with teammates if there are pending Jobs, Survey or Census migrations. With approval/backup, run:

```powershell
npm run db:migrate
```

5. **Regenerate the Prisma Client, then validate and restart**:

```powershell
npm run db:generate
npm run typecheck
npm run test:all
npm run build
```

Finally run `npm run dev`, refresh `http://localhost:3000/projects` and `http://localhost:3000/admin/projects`. If stale Turbopack output persists despite a successful generation, stop the dev server again, delete **only** the local `.next` build cache, and restart:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

**Never** use `prisma migrate reset`, `db:clear-data`, or `prisma db push --force-reset` to address this error.

## Expected result

After a valid schema repair, migrated database and regenerated Prisma Client, `prisma.municipalOfficeDirectoryEntry` and `.municipalOfficeDirectoryProposal` will be generated delegates instead of `undefined`. If the DB migrations were not applied, the next error could be a missing MySQL table; check `npx prisma migrate status` rather than resetting data.

For demo project drafts already present in your DB, no reseeding is required. If you have not seeded, existing `scripts/seed-projects-demo.mjs` is still available; use it only on local DB as described in previous V3 instructions.

## Verification and scope

Tests run here: source-level Node test suite **197 passed, 0 failed, 5 skipped** (with host TypeScript tooling available). Focused schema repair tests: **3 passed**. This isolated environment had no complete npm dependencies or live MySQL; a full Prisma Client generation and Next.js build on your machine still need to run.

The ZIP has **zero modifications to Jobs, Opportunities, Community Survey or Census**. No database data is deleted.
