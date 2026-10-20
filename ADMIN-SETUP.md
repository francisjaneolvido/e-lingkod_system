# E-Lingkod Bayan — Ready-Made Admin Account (One-Time Setup)

**Goal:** One LGU admin account is created straight in MySQL by a local administrator. There is **no public admin registration**, no default password in the code, and no automatic recreation at each start.

## Prerequisites

- Start your MySQL service in XAMPP or similar.
- Make sure your local `.env` has a working `DATABASE_URL` and Better Auth settings.
- In your VS Code terminal, at the folder with `package.json`, run:

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

## Create your initial admin

1. Open your existing **private `.env`** file. Add these three values; substitute **your actual email and a unique password**:

```dotenv
ADMIN_EMAIL=your-lgu-admin@example.com
ADMIN_NAME="LGU Administrator"
ADMIN_PASSWORD="REPLACE_WITH_YOUR_OWN_LONG_UNIQUE_PASSWORD"
```

**Password requirements:** 12–128 characters. Do not use the placeholder shown above as a real password. Do not paste it into a public chat, upload, or repository. Never commit your `.env`.

2. Run this command **once**:

```bash
npm run admin:seed
```

3. The seed creates an `ADMIN` user and a corresponding Better Auth email/password login using Better Auth's password hasher. Open `http://localhost:3000/login` after starting the dev server, sign in, then go to `http://localhost:3000/admin/reports`.

4. **Remove `ADMIN_PASSWORD` from `.env` after successful setup.** Keep your password in your password manager. Your created account remains saved in MySQL. If you run the seed again with the same email, the existing account's password/role will not be overwritten.

## What if I already registered a staff account?

You do not need to run the seed. Promote your **existing registered email** instead:

```bash
npm run civic:admin -- staff@example.com
```

To revoke its admin role:

```bash
npm run civic:admin -- staff@example.com --citizen
```

The seed **will not** silently promote an existing Citizen. It asks you to use the explicit role-promotion command above.

## Every time you run the project

Start MySQL and then:

```bash
npm run dev
```

Do **not** run `npm run admin:seed` every time. Do **not** rerun all Prisma commands at each startup unless the project/dependencies/schema/migrations changed.

## Demo flow

- Register or sign in using a separate Citizen account in another browser profile.
- Citizen: `/reports/new` → submit concern with test photos/location → copy Tracking ID.
- LGU admin: `/admin/reports` → open concern → update the status, assigned office, and remarks.
- Citizen: `/reports` or `/track` → check progress.

Note: The script can only create the account when the target MySQL database is reachable and the migrations have been applied. The archive is source code, not an exported database; it does not contain a pre-created account in your own MySQL instance.
