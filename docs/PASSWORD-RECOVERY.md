# Password recovery

`/forgot-password` requests a reset; `/reset-password` accepts a one-time email link. The existing login page links to recovery. The implementation uses the installed Better Auth 1.7.11 email/password APIs, its `Verification` auth-token table and the Prisma adapter with `transaction: true`. ID reviews use separate models.

## Server-only mail configuration

Configure the same Resend provider used for Staff invitations:

```dotenv
BETTER_AUTH_URL="https://your-site.example"
RESEND_API_KEY="YOUR_PRIVATE_RESEND_KEY"
PASSWORD_RESET_FROM="eLingkod Bayan <no-reply@your-verified-domain.example>"
```

`PASSWORD_RESET_FROM` falls back to `STAFF_INVITE_FROM` when already configured. Use a sender/domain verified with your provider. These values belong in private server environment configuration; never use `NEXT_PUBLIC_` variables. The application makes a server-side HTTPS request to Resend with a 12-second timeout. No dependency or SMTP service was added. A real provider/sender is still required for real delivery; captured local mail does not establish real delivery.

`BETTER_AUTH_URL` must be one exact HTTPS origin without a path, credentials, query or fragment. HTTP is accepted only for localhost/loopback development. Restart after configuration changes. Preserve `BETTER_AUTH_SECRET`. Reverse proxies must preserve the correct host/origin and supply client IPs from a trusted proxy; do not expose a deployment that accepts arbitrary client-supplied forwarded IPs. Better Auth's database-backed limits apply across application instances: three recovery requests per minute per IP, ten reset attempts per minute per IP, in addition to existing authentication limits. Apply the additive release migration containing `rateLimit` before starting this code.

Registered and unregistered addresses receive the same public success response. Better Auth's `advanced.backgroundTasks.handler` registers the asynchronous delivery promise with Next.js `after()` so provider I/O does not hold the HTTP response open. The host must support Next's post-response lifecycle; this is supported by the Node server used by `next start`. The auth route declares a 30-second `maxDuration`, allowing the existing 12-second provider timeout and subsequent cleanup on platforms that honor this setting. Verify the deployment adapter's lifecycle and duration support; this is not a durable delivery queue or a guarantee of delivery across process termination.

Transport failures preserve the public response, invalidate the newly undelivered token and emit only a fixed operator diagnostic. The asynchronous `sendResetPassword` callback awaits both delivery and its failure cleanup within the registered task. An earlier delivered link remains usable until its own expiry. If delivery fails or no email arrives, the user can request another email after the rate-limit window. Provider responses, keys, addresses, review status and reset tokens are not included in application diagnostics. Database work, scheduling and network conditions can still differ; removing the provider wait does not promise perfect timing resistance against a remote observer.

## Reset behavior

- Tokens expire after 30 minutes. Successful reset consumes the token exactly once, revokes every existing session and writes the new credential password in one database transaction. A failure rolls all three changes back so the same link can be retried. A narrow adapter wrapper checks the actual affected-row count when consuming an auth verification row: the installed Prisma/MySQL delete-with-return path returned two successful concurrent consumptions during the initial regression test. The wrapper retains Better Auth's supported token/password transaction APIs. Keep auth tokens and sessions in the database; do not move them to secondary storage without revalidating this behavior.
- The full existing public password policy is enforced on the server and in the form: 12–128 characters, uppercase, lowercase, number and symbol. Password confirmation is a form check. A rejected password does not consume the link.
- Email links use `/reset-password#token=...`. URL fragments are not sent in HTTP requests or Referer headers. The page immediately removes the fragment from its history entry and keeps the token in component memory for the reset POST body. Reloading that page requires reopening the email link. No production or development public endpoint returns a reset link.
- Redirects are restricted to this site's `/reset-password` destination. Recovery pages use `no-referrer` metadata and are excluded from indexing.
- Recovery does not approve an account, mark an email verified, change a role or bypass ID review. A pending Citizen signs back into the same limited verification state.

## Guarded local mail capture

The maintained `scripts/verify-site-release.mjs` runner creates a disposable loopback MySQL database and configures the capture transport. The transport writes private JSON email captures below ignored `.scratch/site-release/` only when **all** of these hold:

```dotenv
ELB_SITE_RELEASE_TEST_DATABASE="true"
DATABASE_URL="mysql://LOCAL_TEST_CREDENTIALS@127.0.0.1:3306/elb_site_release_test_UNIQUE_SUFFIX"
PASSWORD_RESET_CAPTURE_DIR=".scratch/site-release/mail"
NODE_ENV="test"
```

The suffix must match lowercase letters, digits and underscores. Capture is refused in production, on an ordinary schema, on a remote database or outside the private scratch subtree. Leave `PASSWORD_RESET_CAPTURE_DIR` unset for real provider delivery. Captures contain test-only credentials: retain privately, exclude from staging and review archives, and delete according to the local test-evidence policy. Never use real accounts or addresses in these tests.

Focused checks:

```powershell
node --test tests/password-recovery.test.mjs
```

The DB runner additionally executes `tests/password-recovery-db.test.mjs` against its guarded schema. That suite checks captured transport, generic responses, trusted redirects, weak-password retry, expiry, concurrent consumption, reuse, session revocation, unchanged identity state, failed delivery and real MySQL-triggered transaction rollback. It skips without the explicit disposable guard. The runner needs permission to create/drop its temporary schema and a trigger inside that schema; ordinary data is not a target.

The real framework timing regression runs with `node scripts/verify-site-release.mjs --env PRIVATE_DISPOSABLE_ENV --timing` (add `--build` to test `next start`). It holds the actual mail transport at a test-only preload boundary and requires the known-account HTTP response to finish before provider release for both success and failure. It also checks eventual cleanup and unchanged account/session/identity state. The preload accepts only a guarded loopback disposable schema, explicit synthetic credentials, synthetic recipients and private scratch control files. No production transport flag or public route bypass is added. Direct native auth tests install their own task scheduler because they have no Next request scope, drain tasks before inspecting mail/cleanup, and drain and restore the scheduler before disconnecting. Browser checks poll for captured mail after the generic status appears.

Manual review: request a reset for a synthetic pending Citizen, open the captured link, enter a valid new password and sign in again. Confirm the verification-status destination is unchanged and the old session no longer works. Repeat for a legacy Citizen, Staff and Admin without changing their classification or permissions. Check expired/reused links, connection retry, keyboard focus and Light/Dark/OLED at narrow widths. Automated results are recorded separately from this walkthrough.
