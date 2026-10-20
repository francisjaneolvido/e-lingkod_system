# E-Lingkod Bayan — Hackathon Prototype (Civic Reporting V7 + Admin Bootstrap)

**Stack:** Next.js 16, React 19, TypeScript, Prisma 7, MySQL/MariaDB, Better Auth, Tailwind CSS.

## Implemented versus planned features

| Module | Status |
| --- | --- |
| Civic Reporting | Implemented in source: account login, 1–3 photos, location, generated Tracking ID, reporter timeline, status tracking, LGU action desk |
| Online LGU Services | Landing-page concept only; application and approval flow not implemented |
| Emergency Hotlines & Alerts | Landing-page concept only; real hotline numbers and alerts not integrated |
| Municipal Projects & Services | Landing-page concept only; directory and project management not implemented |
| Job Matching | Landing-page concept only; SPES survey import and matching not implemented |
| Worker Census & Social Profiling | Landing-page concept only; survey, storage, and aggregated analytics not implemented |

Civic Reporting is implemented in the source, **not confirmed tested against your running local MySQL instance**. Real LGU integrations are not connected. Use *fictitious* data in demos.

## First-time installation

1. Start MySQL in XAMPP or your MySQL service and create/configure your target database.
2. Create **your own private `.env`** with `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, as described in `SETUP-MYSQL-AUTH.md`. Never commit or share this file.
3. In the project root, run:

   ```bash
   npm install
   npx prisma validate
   npx prisma migrate deploy
   npx prisma generate
   ```
4. To create a ready-to-use admin *without public registration*, follow **`ADMIN-SETUP.md`**. This runs just once and does not require hard-coded demo credentials.
5. Start:

   ```bash
   npm run dev
   ```

## Everyday run

Start MySQL, open the project in VS Code, run only:

```bash
npm run dev
```

Re-run `npm install` only after dependencies change or when setting up a fresh project. Apply `npx prisma migrate deploy` when you receive new migration files. Run `npx prisma generate` when the Prisma schema/client changes. `npx prisma validate` is optional for ordinary startup but useful after modifying the schema.

If *you* edit `prisma/schema.prisma` during development, generate a new migration with `npx prisma migrate dev --name your_change` (development databases only), then `npx prisma generate`. Do not reset a database containing actual reports or users.

## Working routes

- `/` — Landing page and six service previews
- `/login` and `/register` — User authentication (new public users are CITIZEN)
- `/reports/new`, `/reports`, `/reports/[id]` — Citizen reporting
- `/track` — Public Tracking ID lookup (restricted details)
- `/admin/reports`, `/admin/reports/[id]` — Staff-only LGU action desk
- `/account` and `/account/profile` — Account

## Admin options

- New staff account, no registration: `npm run admin:seed` (read `ADMIN-SETUP.md` first)
- Promote an **already registered** user: `npm run civic:admin -- staff@example.com`
- Revoke staff privileges: `npm run civic:admin -- staff@example.com --citizen`

Admin access checks the database role on each protected request. Do not expose admin passwords in source files or screenshots.
