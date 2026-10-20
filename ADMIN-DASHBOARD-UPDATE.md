# E-Lingkod Bayan — LGU Admin Dashboard Update

## What's changed

- Admin pages use a **separate responsive LGU interface** with sidebar + mobile menu, dedicated topbar, profile, and sign-out.
- `/admin` is the homepage for admins: **live** report counts, status breakdown, registered citizen count, recent reports, and six module tiles.
- `/admin/reports` shows a searchable, filterable report-management table linked to the pre-existing functional report status/assignment form.
- `/admin/services`, `/admin/emergency`, `/admin/projects`, `/admin/jobs`, and `/admin/census` are transparently labeled **planned modules**. They do not fake working applications, alerts, jobs or worker data.
- Admin `/account` now sends users to `/admin`. After successful login, an admin gets redirected to `/admin` when there is no special `next` destination.
- Server-side role verification remains required for all `/admin` pages; the public cannot sign up as admins.

## Apply this update (if using the patch)

Copy/merge the patch folders into your **existing project directory** (the one that contains `package.json`). Keep your existing private `.env` file and MySQL data. These updates do not require a new database schema.

## Fix the `civic_report` table error

1. Start MySQL in XAMPP.
2. Confirm your local `.env` has the correct `DATABASE_URL` and existing database name.
3. In PowerShell at the project root:

```powershell
npm install
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`20261019150000_civic_reporting` is the migration that creates `civic_report`, `report_photo`, and `report_update`. If `migrate deploy` reports failure, **do not use `prisma migrate reset`** on a database with valuable data. Check the output and repair the cause first. If it reports all migrations applied but you still see the missing table, verify `DATABASE_URL` is using the same database as the app, and check the database's `_prisma_migrations` state.

4. If you have not yet created the admin, set private `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` (at least 12 characters) and run `npm run admin:seed` one time. Remove `ADMIN_PASSWORD` from `.env` after successful setup.
5. Log in as admin and open **http://localhost:3000/admin**. Citizen account still uses the public portal.

For subsequent normal starts, just start MySQL and run `npm run dev`. `npm install`, migrations, and admin seed do not need to run every time.

**Limitations:** The project was statically validated in a sandbox without your local MySQL/XAMPP database. Live database behavior must be verified on your PC.
