# E-Lingkod Bayan — MySQL + Prisma + Better Auth (V6)

**Use this patch on the existing V5 project.** This ZIP contains additions/replacements only, not a new Next.js app. Do NOT delete your existing `src` or `public` folders. The V4 hero and V5 services stay unchanged.

## 0. Before anything: BACK UP your working project
Close the dev server (`Ctrl+C`). Make a copy of the entire project folder.
Unzip this V6 archive. Merge the `src` and `prisma` folders and copy `prisma.config.ts` and `.env.example` to the PROJECT ROOT (same folder as `package.json`). Choose to REPLACE matching files.

## 1. Check MySQL
Open your MySQL Workbench or phpMyAdmin and connect to the LOCAL server. Ensure the MySQL service is running. If using XAMPP, start **MySQL** in XAMPP Control Panel.

In your SQL editor, run:

```sql
CREATE DATABASE IF NOT EXISTS e_lingkod_bayan
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Only create/use this dedicated empty hackathon database. If you have a database named e_lingkod_bayan that contains data, STOP and check it before applying migration. Do not run migrate reset or force-reset on an existing database.

## 2. Install dependencies (VS Code terminal, from project root)

Minimum: Node.js 22.12+ (or modern LTS). Connect your PC to the internet to download npm packages.

```bash
npm install better-auth @prisma/client@7 @prisma/adapter-mariadb@7 dotenv
npm install -D prisma@7
npm pkg set type=module
```

`npm pkg set type=module` ensures Prisma 7 ESM compatibility and preserves your existing scripts and dependencies. Do not run `npx prisma init`. Prisma folders and config are already included.

## 3. Configure .env

In VS Code, COPY `.env.example` and name the copy `.env` in project root. Replace your database username/password and random auth secret:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/e_lingkod_bayan"
BETTER_AUTH_SECRET="YOUR_LONG_RANDOM_SECRET"
BETTER_AUTH_URL="http://localhost:3000"
```

XAMPP default with a passwordless local root may use:

```env
DATABASE_URL="mysql://root@127.0.0.1:3306/e_lingkod_bayan"
```

If MySQL runs on port 3307 (XAMPP sometimes does), change `3306` to `3307`. If your MySQL password has special characters, URL-encode them: `@` -> `%40`, `#` -> `%23`, `:` -> `%3A`, `/` -> `%2F`, `%` -> `%25`.

In Windows PowerShell, generate a random secret (copy the output into `.env`):

```powershell
$b = New-Object byte[] 48; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

NEVER post your `.env` password or secret to ChatGPT. `.env` is ignored by the project's `.gitignore`.

## 4. Test MySQL connection & create tables

In VS Code terminal:

```bash
npx prisma validate
npx prisma migrate dev --name init_auth
npx prisma generate
```

If migrations complete, inspect your database in MySQL Workbench / phpMyAdmin. You should see `user`, `session`, `account`, `verification`, and `_prisma_migrations` tables.

If `P1001`: MySQL is stopped or wrong port/host. If `P1000`: wrong username/password. If `P1010`: user lacks DB permissions. For `P3014` (shadow database permission), use a MySQL user with development `CREATE DATABASE` rights or ask your team for help; do not bypass safe migration workflows blindly.

## 5. Run and test

```bash
npm run dev
```

- `http://localhost:3000/register` -> create CITIZEN account.
- `http://localhost:3000/dashboard` -> protected dashboard should open after registration.
- Click Log out; then manually visit `/dashboard` -> should redirect to `/login`.
- Sign in at `/login` using the same email/password.
- Check the new account in MySQL `user` and `account` tables. Password is a secure HASH, not plain text.

**Important**: for now, email verification, forgot-password email sending, employer access, and admin creation are NOT implemented. Test with dummy account details and do not collect real community census records or sensitive personal data.

## 6. Files and organization

```text
prisma/schema.prisma                        MySQL auth tables + CITIZEN role
prisma.config.ts                           Prisma CLI connection settings
.env.example                               Template only; never share real .env
src/lib/prisma.ts                          Single server-side Prisma instance
src/lib/auth.ts                            Better Auth server config
src/lib/auth-client.ts                     Browser-side auth client
src/app/api/auth/[...all]/route.ts         Next.js auth API handlers
src/features/auth/components/login-form.tsx     Functional login
src/features/auth/components/register-form.tsx  Functional registration
src/features/auth/components/logout-button.tsx  Logout control
src/app/(citizen)/dashboard/page.tsx       Server-protected citizen dashboard
```

## Troubleshooting

- **Port 3000 already in use:** stop other Next.js servers and run again; keep BETTER_AUTH_URL matched to whichever port you use.
- **`Cannot find module '@/generated/prisma/client'`:** run `npx prisma generate` and restart VS Code TypeScript server.
- **`Unknown database`:** create `e_lingkod_bayan` with SQL above.
- **Signup fails / error 500:** read the VS Code terminal (not only browser), confirm schema migrated and `.env` loaded. Restart `npm run dev` after editing `.env`.
- **Existing tables:** ask before migrating because this patch assumes dedicated empty development DB.

Official docs: https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql and https://better-auth.com/docs/integrations/next
