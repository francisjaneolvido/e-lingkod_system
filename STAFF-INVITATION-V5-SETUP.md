# eLingkod Bayan V5 — Secure LGU Staff Invitation & Activation

Based on the V4 Civic Reports + staff permissions project. This patch adds an invitation flow without changing existing citizen passwords or accounts.

## 1. First-time installation (Windows / XAMPP)

1. Back up `C:\e-lingkod-bayan` **and your MySQL database**.
2. Copy/merge the V5 patch into `C:\e-lingkod-bayan` (the folder with `package.json`). Do **not** overwrite your `.env`.
3. Start **MySQL** in XAMPP. Open PowerShell in the project folder.
4. Run:

```powershell
npm install
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run test:civic
npm run test:staff
npm run dev
```

**Do not use `prisma migrate reset` on an existing database.** The new migration `20261020234500_staff_invitations` adds a `staff_invitation` table; existing users and reports remain intact.

## 2. Local demo: copy one-time invitation links

Add these lines to your local `.env` (not to a public repository):

```dotenv
BETTER_AUTH_URL="http://localhost:3000"
STAFF_INVITE_DEMO_LINKS="true"
```

`STAFF_INVITE_DEMO_LINKS` works ONLY in development (`npm run dev`), not in a production build.

Login as **Super Admin** and open `/admin/staff`.

- Under **Create & invite LGU staff**, enter the person's **name, email, department, designation and permissions**. Click **Create demo invitation**.
- The page displays a one-time **activation link** (no email has been sent). Copy it securely. Open the link in an incognito window or a separate browser for the staff account.
- Staff sees their invited name/email/department, chooses a **12–128 character password**, confirms it and activates.
- Staff goes to `/login` and signs in with their own credentials. Their sidebar and authorized actions follow the saved department/modules.
- The invitation will show **Activated**. It can no longer be used. For a pending/expired invite, use **Resend link** (invalidates the old link) or **Revoke**.

The activation URL uses the host in `BETTER_AUTH_URL`. If you are testing on a **different PC or phone**, `localhost` points to *that device*, not the server. Use a reachable local development URL and configure the auth base URL accordingly. **Don't expose this unaudited prototype on the public internet.**

## 3. Real emails (optional)

For *real* email invitations, verify a sender address/domain with Resend and set these **server-only** variables in `.env`:

```dotenv
BETTER_AUTH_URL="https://your-configured-domain.example"
RESEND_API_KEY="your-server-side-key"
STAFF_INVITE_FROM="eLingkod Bayan <invites@your-configured-domain.example>"
```

In email mode, the API calls Resend over HTTPS and returns **sent** only when the provider accepts the email request. Provider acceptance is **not** proof of inbox delivery. If email delivery fails, the record remains pending, and a Super Admin can retry **Resend link** after fixing the configuration. An SMTP server is not included.

If neither demo mode nor email delivery is configured, the invitation button is disabled. No account or password is created.

## 4. Security and account lifecycle

- Only logged-in users whose server-side role is `ADMIN` can create/revoke/resend invitations and view the invitation list.
- No preselected password, shared credentials, or public staff self-promotion. The **user and credential account are created only on successful activation**.
- Every token is 32 random bytes; only its SHA-256 hash is saved in MySQL. Links expire in **48 hours**, are single-use, and are invalidated when regenerated or revoked. Tokens aren't included in server-side error logs or saved as plaintext.
- The server validates permissions again during redemption and issues them with the new account inside one database transaction. If the same email has a citizen account already, use **Assign an existing account** instead of creating a duplicate.
- The activation page is non-indexable, and its route sets `Referrer-Policy: no-referrer` and disables caching.
- The current Better Auth configuration allows email+password login, but this prototype does **not** include a forgotten-password email flow, verified organizational email ownership checks in demo mode, enforced MFA, or production-grade anti-abuse controls. **Do not use real citizen/staff personal information or deploy to an LGU without privacy, security, and operational review.**

## 5. Smoke test: expected behavior

1. Super Admin: invite a NEW work email with only `REPORTS` permission. Confirm **Awaiting activation** in the invitation directory.
2. Try signing in with that email **before** activation. Login must fail because no user/password exists.
3. Open the activation link, set a strong password, then sign in. Staff should access `/admin` and **Civic Reports** only; citizen directory and staff management must remain unavailable.
4. Test `CIVIC REPORTS` report assignment restricted to the staff's department per V4.
5. Reuse the activation link; it must show unavailable.
6. Create another invitation, then **Revoke**. Its link must no longer activate an account.
7. Create a third pending invitation and select **Resend link**. Only the newest link must work.
8. Enter a currently registered citizen email into Create & invite. The server must reject it and direct you to **Assign an existing account**.
9. Verify that unassigned modules remain inaccessible even when their URLs are typed manually.

## 6. Clarification about what's implemented

This version implements new-personnel invitation, single-use activation, server-created credentials, and existing V4 role/department/module management. It does **not** introduce actual processing for Online LGU Services, Emergency Alerts, Jobs or Census—those are still marked as previews. The source has been syntax-checked, but full Next.js browser build and MySQL migration must still be tested on your machine.
