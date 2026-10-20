# E-Lingkod Bayan — Civic Reporting V7

This patch extends the `e-lingkod-bayann.rar` project you supplied. It adds a complete citizen report → LGU review → citizen progress workflow, while keeping the existing eLB branding and feature-based structure.

## 1. Copy and replace

1. Stop the development server with `Ctrl+C` and keep a backup of your project folder.
2. Extract `ELB-Civic-Reporting-V7.zip`.
3. Open the extracted `REPLACE-IN-PROJECT` folder.
4. Copy **all contents inside that folder** into your existing project root: the folder containing your current `package.json`.
5. Select **Replace files in the destination** and merge existing folders.

Do not replace the whole `src` folder by deleting it. Merge the files into it. Keep your current `.env`, database, existing files, and images. No `.env`, test accounts, database dump, `node_modules`, or `.next` folder is included in this patch.

## 2. Start MySQL and install

Start MySQL in XAMPP or your existing MySQL service. In the VS Code terminal, from your project root:

```bash
npm install
npx prisma validate
npx prisma migrate deploy
npx prisma generate
npm run dev
```

These commands use your existing `.env` configuration. Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. The browser URL must match `BETTER_AUTH_URL` (normally `http://localhost:3000`).

The new migration creates only `civic_report`, `report_photo`, and `report_update`, including their indexes and foreign keys. Existing authentication tables and account records are retained. `migrate deploy` applies pending migrations and does not need a shadow database.

Do not use `prisma migrate reset` or `db push --force-reset` to install this patch.

## 3. Enable an admin account

Register a separate staff account through the website. Then run the following, replacing the email with the registered staff account:

```bash
npm run civic:admin -- your-registered-email@example.com
```

Refresh the website and open:

```text
http://localhost:3000/admin/reports
```

The account menu will show **LGU action desk**. Public registrations always receive the Citizen role. There is no default admin email or password. The script changes only the existing account that matches the email you enter.

**New option:** You can now create a ready-to-sign-in staff account without registering on the website. Follow `ADMIN-SETUP.md` and run `npm run admin:seed` once. Supply your own private `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in `.env`. No built-in shared login/password is included.

To return that account to Citizen later:

```bash
npm run civic:admin -- your-registered-email@example.com --citizen
```

Staff permissions are checked against the current database role on every protected request, including when an existing session is still active.

## 4. Try the complete workflow

Use different browser profiles, or a normal window and an Incognito window, for the citizen and staff accounts.

| Citizen | LGU staff |
| --- | --- |
| Open `/reports/new` | Open `/admin/reports` |
| Choose a concern type and describe it | Open a submitted concern |
| Attach 1–3 photos | Mark it Under review and record remarks |
| Use GPS at the incident site, or enter an address/manual coordinates | Assign the responsible office |
| Submit and copy the generated tracking ID | Move it to In progress, then Resolved |
| Open `/reports` and the report detail | Record a clear remark with each update |
| Read the progress trail and assigned office | Use search and status filters to manage the desk |

The citizen report page and My Reports check for updates every 30 seconds while visible. A manual Refresh button is also available. The staff editor uses manual refresh so ongoing edits are not interrupted.

Open `/track` without signing in and enter a saved tracking ID. This displays status, office assignment, and status timestamps. It does not display the reporter, photos, report title/description, address, coordinates, or staff remarks. Full details remain with the reporter and authorized staff.

No sample ID is substituted for an actual database report.

## 5. Screens and project structure

| URL | Purpose |
| --- | --- |
| `/reports/new` | Photo-based citizen reporting, GPS/manual location, submission receipt |
| `/reports` | My Reports, keyword search, status filters, report cards |
| `/reports/[id]` | Owner-only details, photo evidence, map, office, progress history |
| `/track` | Public lookup using the generated tracking ID |
| `/admin/reports` | Protected LGU action desk and report queue |
| `/admin/reports/[id]` | Protected review, office assignment, status changes, remarks |
| `/` | Existing landing design, connected report links, actual recent citizen reports |

```text
src/features/civic/
  components/           report form, photo/location inputs, list, detail, tracking, admin editor
  server/               database queries, mutations, bounded request reading, API responses
  config.ts             categories, statuses, allowed transitions, limits, date formatting
  types.ts              public and private data shapes
  validation.ts         server-side field and workflow validation
  civic.module.css      scoped responsive Civic Reporting design
src/app/(citizen)/reports/  citizen routes
src/app/admin/reports/      staff routes
src/app/track/              public tracking page
src/app/api/reports/        reporting, private photos, tracking APIs
src/app/api/admin/reports/  protected staff APIs
src/lib/access.ts          shared session and current-role checks
prisma/                    schema and additive Civic Reporting migration
scripts/set-admin.mjs      targeted admin grant/revocation
public/fonts/              local Poppins font files and license
tests/                    framework-independent validation tests
```

The original landing images are reused from your existing `public/images/landing` folder. New Poppins font assets are included locally so the interface does not need an external font stylesheet.

## 6. Behavior and limits

- Photos: JPG, PNG, or WebP; 1–3 photos; maximum 3 MB per file; maximum 24 megapixels per image. The server decodes each image, removes embedded metadata, resizes it, and stores a JPEG in MySQL. Corrupt images and disguised non-image uploads are rejected.
- Written location: barangay/area plus address/landmark are required. GPS coordinates are optional when unavailable. An address-only report is clearly labeled and never shown as GPS captured.
- GPS: requires HTTPS or localhost, browser permission, and an available device location. The user should capture their position only at the incident site. The map preview uses OpenStreetMap and needs internet access; the written location and coordinates remain available without the map.
- Submission: a retry with the same submission key returns the original report. A citizen can submit up to 10 reports per hour.
- Status: Submitted → Under review → In progress → Resolved. Staff can decline a report during review, or reopen a resolved/declined report to Under review. Every update requires remarks; In progress/Resolved require an office.
- Concurrent edits: a stale staff update is rejected instead of overwriting a newer one.
- Lists: 200 reports load initially. Use **Load older reports** for more. Counts, keyword search, and filters apply to the loaded records.
- Scope: Civic Reporting is implemented. Online applications, emergency calls/advisories, municipal projects, SPES matching, and worker profiling remain previews. Their wording has been aligned with your six-module requirements. No official LGU system or emergency dispatch is connected.

## 7. Checks

```bash
npm run typecheck
npm run lint
npm run test:civic
npm run build
```

Validation results for this delivery are recorded in `CIVIC-VALIDATION.txt`.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `Cannot find module sharp` | Run `npm install` from the project root, including optional/native dependencies. Use Node.js 22.12+ or a supported newer LTS. |
| A `CivicReport` / `reportPhoto` type is missing | Run `npx prisma generate`, then restart VS Code's TypeScript server. |
| Table `civic_report` does not exist | Start MySQL, confirm the database in `.env`, and run `npx prisma migrate deploy`. |
| Prisma P1001 or connection refused | Start your MySQL service and check the existing host/port in `DATABASE_URL`. |
| Prisma P3005 / database is not empty | Existing tables lack matching migration history. Preserve the data and inspect migration status before baselining the original auth migration. Do not reset the database. |
| Submission says to use the E-Lingkod Bayan tab | Match the browser origin with `BETTER_AUTH_URL`; restart after editing `.env`. Use the same hostname and port for login and reports. |
| Staff page says access is required | Register the staff email first, run `npm run civic:admin -- that-email`, and refresh. |
| Location was declined or times out | Use the written address/landmark and optional manual coordinates. |
| Old content appears after replacing | Stop Next.js, remove only the generated `.next` folder, restart, and hard-refresh with `Ctrl+Shift+R`. |

Technical references: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/caching), [Prisma migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production), [Better Auth sessions](https://better-auth.com/docs/concepts/session-management).
