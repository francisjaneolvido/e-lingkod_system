# 07 — Troubleshooting

[README](../README.md) · [Setup guide](02-installation-and-environment-setup.md) · [Architecture](03-project-architecture.md) · [Testing](05-testing-phase.md)

Start with the first failing boundary: terminal command, dependency installation, compilation, HTTP request, Auth, database policy, or Storage. Save the exact error, route, account role, expected behavior, recent change and environment. Remove tokens, passwords, private URLs and personal data before posting logs. A browser message alone often omits the useful server error.

All commands below are **later developer diagnostics**, run in PowerShell at the repository root unless stated otherwise. SQL runs in the Supabase SQL Editor. None was executed as an application repair for this handoff.

## Node, npm and PowerShell

### Node is not recognized, or the version is wrong

**Problem:** `node` is unavailable, or `node --version` still shows the previous release after installation.

**Possible Cause:** the terminal inherited old PATH, Add to PATH was omitted, or another Node installation/version manager resolves first.

**Solution:** close/reopen PowerShell and the IDE; run `where.exe node` and `Get-Command node -All`. Check `Test-Path 'C:\Program Files\nodejs\node.exe'`. If the executable exists, repair the corresponding Windows Path entry or version-manager selection. If absent, use the official Node 24 LTS installer from [setup section 1](02-installation-and-environment-setup.md#1-nodejs-and-npm). Do not mix several installation methods while diagnosing.

**Verification:** a fresh terminal resolves the intended executable and reports `v24.x.x`; `npm.cmd --version` also works.

### PowerShell blocks npm or npx

**Problem:** PowerShell says `npm.ps1`/`npx.ps1` cannot be loaded because script execution is disabled.

**Possible Cause:** PowerShell chose the `.ps1` shim, which is subject to the local execution policy.

**Solution:** run `npm.cmd`/`npx.cmd` instead. Use `Get-Command npm -All` to see the competing shims. No machine-wide policy change or administrator terminal is required for this workaround. For policy background, see [Microsoft execution policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies).

**Verification:** `npm.cmd --version` and the intended `npm.cmd run ...` script execute without a policy error.

### npm cannot find package.json

**Problem:** npm reports `ENOENT`, missing `package.json`, or a script appears to be absent despite being in this project.

**Possible Cause:** the terminal is in System32, `src`, a parent directory, a ZIP view or a different checkout.

**Solution:** run `Get-Location`, `Test-Path .\package.json` and `git rev-parse --show-toplevel`. Use the quoted `Set-Location -LiteralPath` from [the setup guide](02-installation-and-environment-setup.md#setup-order-and-working-directory), then inspect `package.json`. Do not create another package manifest to clear the error.

**Verification:** the manifest belongs to `e-lingkod-bayan`; the expected `dev`, `lint`, `typecheck`, `build`, `start` scripts are visible.

### Dependency download fails

**Problem:** `npm ci` fails with network timeout, `ENOTFOUND`, certificate, proxy, 401 or 403 errors.

**Possible Cause:** package registry/network access is blocked, a stale proxy is set, an organization's certificate is missing, or an incorrect registry/auth configuration is active.

**Solution:** read the failing URL/package, then run `npm.cmd config get registry` and `npm.cmd ping`. For this public package set the normal registry is `https://registry.npmjs.org/`; preserve intentional organization settings. Check Windows network/proxy access and the configured `.npmrc` without publishing its tokens. On a managed network, obtain the approved CA/proxy configuration rather than disabling TLS verification. Run `npm.cmd cache verify` only if the error indicates corrupt cached content; do not start with deleting the lockfile/cache.

**Verification:** registry ping and the same `npm.cmd ci` complete; inspect `npm.cmd ls --depth=0` for required dependency errors. [npm configuration](https://docs.npmjs.com/cli/v11/using-npm/config), [npm ping](https://docs.npmjs.com/cli/v11/commands/npm-ping).

### Lockfile mismatch or locked files

**Problem:** `npm ci` reports package/lock mismatch, `EPERM`, `EBUSY` or a file it cannot replace.

**Possible Cause:** an unreviewed manifest edit, simultaneous install/dev process, antivirus file scan, or OneDrive synchronization is holding files.

**Solution:** use `git diff -- package.json package-lock.json` to identify intended edits. The nominated dependency owner regenerates/reviews the lockfile with `npm install` only if the manifest change is intentional; others pull it and use `npm ci`. For locked files, stop your dev/build processes, close file viewers, keep OneDrive content locally available and retry once synchronization/scanning finishes. Do not delete source files, force npm peers, or move the project without team agreement.

**Verification:** one intended lockfile change is reviewed, or a clean checkout installs using the committed lockfile; repeated install is not needed after every source edit.

## Git authentication and collaboration

### Git cannot authenticate or repository is not found

**Problem:** clone/fetch/push returns authentication failed, 403, or repository not found.

**Possible Cause:** wrong remote, invitation not accepted, wrong browser/GCM account, expired credential, or missing organization authorization.

**Solution:** inspect `git remote -v` and open that repository signed in to GitHub. Confirm invitation and write access. Reattempt `git ls-remote origin` and complete the Credential Manager browser flow. If cached credentials are demonstrably wrong, remove only the relevant GitHub entry from Windows Credential Manager, then retry. Use a supported GCM build; never put a token in the remote or paste credentials into a PR. [Credential guidance](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git).

**Verification:** fetch succeeds; a push to your own feature branch succeeds. Read access alone does not prove write permission.

### Push is rejected as non-fast-forward

**Problem:** Git refuses a push because the remote branch contains work not present locally.

**Possible Cause:** a teammate/another machine updated that branch, or the local branch is behind.

**Solution:** first `git status`; commit owned changes or preserve them deliberately. Run `git fetch origin`, inspect the branch relationship, and merge `origin/YOUR-BRANCH` into your current owned branch. Resolve conflicts with the other author, rerun checks, then push normally. If pushing `main` is blocked, use a feature branch and PR as intended. Do not force-push over remote work. [Non-fast-forward explanation](https://docs.github.com/en/get-started/using-git/dealing-with-non-fast-forward-errors).

**Verification:** `git status` reports the expected branch relationship, the normal push succeeds, and GitHub shows both developers' intended changes.

### Merge conflict in code, docs or lockfile

**Problem:** Git lists unmerged files and conflict markers appear.

**Possible Cause:** branches changed the same lines or incompatible shared contracts.

**Solution:** `git status` identifies conflicts. Resolve source/docs deliberately with the owner, remove all markers, stage named files and run the applicable checks before committing. For `package-lock.json`, agree on the combined manifest first; the dependency owner generates one consistent lockfile and reviews the changes. Do not hand-choose random lockfile sections. To cancel an unfinished merge safely, use `git merge --abort` before attempting another approach. [Conflict procedure](02-installation-and-environment-setup.md#branch-commit-push-and-review).

**Verification:** `git diff --check` is clean, no unmerged files remain, lint/typecheck/build pass and affected workflows still work.

### Environment file was committed

**Problem:** `.env.local` appears in `git ls-files -- '.env*'`, or a secret is in a published commit/log.

**Possible Cause:** the file was tracked before ignore rules, force-added, or copied into source.

**Solution:** revoke/rotate exposed privileged credentials first. Coordinate removing the file from tracking with `git rm --cached -- .env.local` while retaining the local file; follow [GitHub history-cleanup guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) when relevant. Do not rewrite shared history without coordination. Adding `.gitignore` alone does not untrack an existing file.

**Verification:** the old secret no longer works, tracked files contain no live secrets, `git check-ignore .env.local` succeeds, and collaborators have the replacement through a private channel.

## Next.js installation and build

### Port 3000 is occupied

**Problem:** Next cannot bind port 3000 or starts on another port.

**Possible Cause:** another dev server or application already listens there.

**Solution:** identify the listener before stopping anything:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Use `Get-Process -Id THE_DISPLAYED_PID` with the actual numeric ID to identify it. Stop an owned dev server with Ctrl+C in its terminal. Otherwise choose `npm.cmd run dev -- --port 3001` and update local site/redirect origins to 3001. Do not kill an unfamiliar process.

**Verification:** the printed local URL opens and Auth redirects return to that same origin/port.

### React peer dependency conflict

**Problem:** `ERESOLVE`, invalid React peer warnings or invalid hook call after package changes.

**Possible Cause:** React/DOM versions diverge, multiple React copies, or an older map/UI dependency does not support React 19.

**Solution:** inspect `npm.cmd ls react react-dom next react-leaflet leaflet`. Compare the package's `npm.cmd view PACKAGE@VERSION peerDependencies` to the [verified compatibility matrix](01-prerequisites.md#c-frontend-and-backend-dependencies). React Leaflet 5 requires React/DOM 19 and Leaflet 1.9. Align packages in one reviewed lockfile PR; do not use `--force`/`--legacy-peer-deps` to suppress an unexplained conflict. For a hook error also check that hooks are called in Client Components at component/hook top level, not ordinary functions or conditionals.

**Verification:** `npm ls` has no required invalid peers or unintended React copies; the same workflow and production build work.

### Compilation fails or a module cannot be found

**Problem:** Next/TypeScript cannot resolve an import, or production build fails before a route is generated.

**Possible Cause:** missing declared dependency, wrong import alias/case, server-only module imported by a client, stale generated Prisma reference, or unsupported config copied from another Next version.

**Solution:** read the first source error and its import trace. Check that `@/*` maps to `src/*`, the target is committed, and filename case matches exactly. Vercel is case-sensitive even when Windows masks a mismatch. For legacy Prisma/Auth traces, finish the migration checkpoint rather than adding MySQL credentials. Consult version-local Next docs per [AGENTS.md](../AGENTS.md) once dependencies exist. Do not turn off type errors or broad ESLint rules to make the build green.

**Verification:** lint/typecheck/build exit 0 and the affected route loads in both development and a production start.

### Cache Components or browser/server boundary error

**Problem:** a page build rejects request-time cookies/current time, complains about missing Suspense, or reports `window is not defined`.

**Possible Cause:** the current cache configuration prerenders a path using request-time/browser-only data at the wrong boundary.

**Solution:** inspect `next.config.ts`, which enables Cache Components. Keep auth/cookies outside shared `use cache` functions and use the current request-time/Suspense pattern for personalized content. Preserve the fixed footer year until an alternative is verified. For browser-only libraries, move the import to the client-only dynamic boundary rather than adding a global fake `window`. [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).

**Verification:** build/prerender succeeds; two users cannot receive each other's cached personalized content; map routes survive direct refresh.

## Tailwind, shadcn and TypeScript

### Styles are missing or Tailwind command is unavailable

**Problem:** utility classes render as plain HTML, CSS build fails, or `tailwindcss init -p` is unavailable.

**Possible Cause:** missing global CSS import, a broken existing Turbopack rule, or mixing Tailwind 3 instructions/PostCSS setup with this Tailwind 4 checkout.

**Solution:** inspect `src/app/layout.tsx`, `globals.css` and `next.config.ts`. Restore the existing `@import "tailwindcss"`, theme variables and single CSS processing path. Confirm installed versions with `npm.cmd ls tailwindcss @tailwindcss/turbopack`. Do not add a second pipeline or run the old init command. [Setup section 5](02-installation-and-environment-setup.md#5-tailwind-css-and-shadcnui) distinguishes the current checkout from a plain starter.

**Verification:** existing buttons/colors/spacing render correctly and production CSS builds.

### shadcn generation overwrites components or props fail

**Problem:** a generated control does not match its example or TypeScript rejects props from a tutorial.

**Possible Cause:** wrong Base UI/Radix example, reinitialization with a different preset, alias drift, or overwrite of a customized source component.

**Solution:** inspect `components.json` (`base-nova`, Base UI) and the actual exported component props. Reuse those exports, preserve `@/*` aliases, and add only missing controls in the shared UI PR. Compare/revert unintended generated changes with their owner; do not blindly rerun `init` or accept every overwrite prompt.

**Verification:** typecheck passes and keyboard, focus, dialog closing and mobile interaction behave as expected.

### Type errors around async cookies, nulls or library types

**Problem:** `cookies().get...` fails, a possibly-null query result is used directly, or Leaflet types are absent.

**Possible Cause:** outdated synchronous cookies examples, assuming query/Auth success, or missing `@types/leaflet`.

**Solution:** use `await cookies()` in the async server helper for Next 16; handle `error` and absent `data` before reading fields; add `@types/leaflet` as documented. React Leaflet bundles its own types, so no separate React Leaflet type package is needed. Keep React declaration major 19 and review Node 24-specific APIs against the project's Node declaration version. Do not scatter `any` or non-null assertions to hide failed requests. [Next cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies).

**Verification:** `npm.cmd run typecheck` exits 0; error/empty states are exercised, not just compiled.

## Environment variables

### Variable is undefined, malformed, or stale

**Problem:** invalid Supabase URL/key, missing configuration at runtime, or a deployment still uses old public values.

**Possible Cause:** `.env.local.txt`, wrong directory/name, copied Dashboard/PostgreSQL URL, shell syntax in dotenv, stale dev process, wrong Vercel scope, or no rebuild after a public variable change.

**Solution:** inspect file names with `Get-ChildItem -Force -Name .env*`; keep `.env.local` beside `package.json`. Compare variable names, not printed secrets, to [the template](02-installation-and-environment-setup.md#configure-local-environment-and-missing-packages). Use HTTPS project URL and matching publishable key. Restart local dev; in Vercel verify Preview versus Production and redeploy. `NEXT_PUBLIC_` values are embedded during build. Never “fix” a server secret by exposing it to the client. [Next environment rules](https://nextjs.org/docs/app/guides/environment-variables).

**Verification:** the application makes requests to the intended project/origin; required variables exist without logging their full values; the new deployment passes the same request.

## Supabase connectivity, authentication and RLS

### Supabase request fails before data access

**Problem:** `Failed to fetch`, invalid API key, unauthorized API response or project unavailable.

**Possible Cause:** wrong project URL/key pairing, paused project, network/DNS block, or disabled/mis-scoped Data API.

**Solution:** use browser Network to identify request host, status and non-sensitive response error. Confirm the project is active, URL/key belong together, required schema is exposed and the service status has no incident. Dashboard SQL success checks database availability only. Compare an authorized application request after the server restarts; do not add a service-role key to bypass a client failure. [Setup section 6](02-installation-and-environment-setup.md#6-supabase-postgresql), [Supabase status](https://status.supabase.com/).

**Verification:** an allowed application read/write works using publishable key plus the actual user's JWT; a forbidden request remains denied.

### Table is missing or schema cache reports an unknown field

**Problem:** relation/column not found or a PostgREST schema-cache error occurs.

**Possible Cause:** migration not applied, wrong Supabase project/schema, misspelled field, or schema cache has not reloaded after an actual schema change.

**Solution:** compare exact names with the contract and the migration application ledger. In Dashboard SQL, inspect `information_schema.tables`/`information_schema.columns` for the intended table rather than rerunning all migrations. If the schema change is present but PostgREST is stale, follow its [schema cache reload guidance](https://docs.postgrest.org/en/stable/references/schema_cache.html). Never apply MySQL/Prisma migrations to this PostgreSQL database.

**Verification:** the expected schema is visible through the intended API and the application query succeeds without bypassing RLS.

### Signup or login fails; confirmation email is missing

**Problem:** invalid credentials, email not confirmed, recipient not authorized or a rate-limit response.

**Possible Cause:** account exists only in the old Better Auth database, wrong Supabase project/password, confirmation still pending, or default Auth SMTP restrictions.

**Solution:** inspect Supabase Auth logs and Users for the correct project. Recreate synthetic demo accounts through supported Supabase provisioning; legacy MySQL passwords/cookies do not transfer. For mail errors check allowed recipient/provider sandbox, verified sender and rate limits before sending again. Use controlled pre-confirmed demo accounts when mail is deferred; do not claim those are verified resident identities. [Auth configuration](02-installation-and-environment-setup.md#7-supabase-auth-and-application-roles).

**Verification:** the selected test account signs in on the intended project, with its corresponding profile; incorrect credentials still fail clearly.

### Authentication succeeds but protected pages fail

**Problem:** login returns success then redirects back to login, staff gets denied, or refresh loses the session.

**Possible Cause:** missing SSR cookie propagation/proxy, an old Better Auth consumer, missing `profiles` row, mismatched Auth UUID/role, or sharing session cookies across origins incorrectly.

**Solution:** inspect Network redirects and cookie names/attributes without copying values. Confirm Next 16 `src/proxy.ts` runs for the affected routes and returns refreshed cookies; check callback/login exclusions. Search the import trace for old Auth consumers. Compare the validated Auth user UUID to `profiles.id`, exact role and trusted role lookup; a new account defaults to citizen. Do not authorize from `getSession()` alone or change the user's role in browser metadata. [SSR setup](https://supabase.com/docs/guides/auth/server-side/nextjs).

**Verification:** sign in, refresh and open another tab; sign out and confirm protected read/mutation denial. Staff/citizen permissions match their trusted profiles.

### Confirmation or deployed login returns to the wrong origin

**Problem:** a deployed email link opens localhost, a callback is rejected, or the browser loops between callback and login.

**Possible Cause:** wrong Site URL, missing exact allow-list URL, stale email template, missing route/token exchange, port mismatch or lost cookies on a redirect response.

**Solution:** compare the actual full link/callback origin and path to the implementation. Update Supabase Site URL/allow-list and the app's origin configuration, rebuild public values, and use a fresh link. Keep confirmation/callback routes accessible to unauthenticated users and validate same-site post-login destinations. Registering a URL does not create its handler. [Redirect rules](https://supabase.com/docs/guides/auth/redirect-urls).

**Verification:** a fresh confirmation flow reaches the correct HTTPS/local origin, establishes a session and handles an expired link without a loop.

### RLS rejects a query, or returns an empty list unexpectedly

**Problem:** `42501`, new row violates RLS, permission denied, or a known row is absent.

**Possible Cause:** missing table grant/policy, no valid JWT, wrong owner field, role mismatch, or SELECT policy does not permit a returned/updated row. An empty result can be the correct private-data denial.

**Solution:** test with the same account and publishable client, not the Dashboard's elevated SQL session. Check table grants, operation-specific policy, actual `auth.uid()`, row `citizen_id`, and role. INSERT/UPDATE checks must validate new row ownership; UPDATE also needs appropriate SELECT access. Check that an insert requesting a returned row has SELECT permission. Fix the narrow policy/contract defect; never disable RLS or replace the browser key with a secret. [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Verification:** the owner can complete the intended operation; another citizen and signed-out caller cannot. Record both allow and deny outcomes.

### Recursive profile policy or a user can change their role

**Problem:** infinite-recursion policy error, or a direct citizen profile update grants staff access.

**Possible Cause:** a profile policy queries itself, or row ownership permits a protected role-column update.

**Solution:** follow the architecture's private trusted role-helper design with fixed search path and restricted execution, and separate safe profile editing from privileged role assignment. Revoke broad client UPDATE where column restrictions are needed. Never use signup `user_metadata` as staff authority. A successful privilege-escalation test is a release-blocking defect, not an acceptable demo shortcut.

**Verification:** role lookup works without recursion, own safe profile reads/edits work as designed, and citizen role tampering fails through both UI and direct API.

## Storage and upload failures

### Upload is rejected, too large, or collides

**Problem:** Storage policy error, file size/type rejection, 413 or duplicate-object response.

**Possible Cause:** wrong bucket/path, missing INSERT policy, parent not owned by caller, unsupported file, Server Action/platform body limit, or filename reuse.

**Solution:** inspect the failing request URL first: app endpoint and Supabase Storage enforce different limits. Confirm private bucket ID, allowed 5 MB types, user's valid Supabase session, `user_id/parent_id/random.ext` path, owned parent, exact stored `photo_expected_path` and `pending` upload state. Prefix-only policy checks can permit extra objects under one parent. Upload directly to Storage with fresh random names and `upsert: false`; finalize safely on the server. Do not give everyone UPDATE permission to solve collisions. See [storage setup](02-installation-and-environment-setup.md#8-supabase-storage).

**Verification:** supported small file uploads and completes its parent; invalid/oversized files fail clearly; a different citizen cannot upload into that parent or read it.

### Private file preview disappears or report stays pending

**Problem:** image is broken after reload, signed URL stops working, or upload succeeded but the report never becomes complete.

**Possible Cause:** expired signed URL was stored instead of the object path, missing SELECT authorization, object path mismatch, failed finalization or an orphan object.

**Solution:** compare stored bucket-relative path with the actual object; generate a fresh short-lived signed URL after access checks. Pending uploads use the reserved `photo_expected_path`; successful finalization moves that value to `photo_path` and clears the reservation. Inspect finalization errors and `photo_state`; retry the existing owned parent rather than creating another report. Verify content/size/path before marking ready. Clean abandoned objects through the authorized cleanup flow; do not make the bucket public.

**Verification:** refresh produces a valid new authorized preview; ready state appears only after finalization; retry creates no duplicate report and staff queues hide pending/failed submissions.

## Leaflet and browser location

### Map is blank, crashes on refresh or has no marker

**Problem:** gray/zero-height map, `window/document is not defined`, missing marker icon or blocked tiles.

**Possible Cause:** missing Leaflet CSS/height, server-evaluated import, incorrect asset URLs, network/tile-policy restriction or initialization while a hidden panel has no size.

**Solution:** follow [map setup](02-installation-and-environment-setup.md#9-leaflet-react-leaflet-and-openstreetmap): client-only dynamic import from a Client Component, CSS once, explicit height, correct tile URL/attribution. Inspect Network tile/icon requests. Use an imported icon or `divIcon` rather than a broken filesystem path. If a map was created inside a hidden dialog, update its size when shown. Keep manual coordinates available during a tile outage; do not bulk-fetch tiles to work around restrictions.

**Verification:** direct page refresh, visible panel opening and mobile resizing all show usable tiles/marker; click selection produces the same saved latitude/longitude.

### GPS does not prompt or returns an error

**Problem:** permission denied, timeout, position unavailable, or no geolocation API on a phone.

**Possible Cause:** site permission blocked, OS location disabled, weak signal, insecure LAN HTTP, or unsupported context.

**Solution:** invoke location from the user's explicit action, inspect the error code and site/OS permissions, and use HTTPS preview or localhost. Do not repeatedly prompt after denial. Offer a movable marker plus required location text, with typed coordinates if tiles fail. Validate finite coordinate ranges and never silently submit a default position. [MDN geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

**Verification:** allow succeeds where available; denied/timed-out location still permits an explicitly chosen valid manual location and saves it correctly.

## Optional integrations

### Realtime receives nothing or duplicate updates

**Problem:** database status changes but an open page stays stale, or receives the same change several times.

**Possible Cause:** missing publication membership, wrong schema/event/filter, SELECT/RLS denial, disconnected socket, or duplicate uncleaned subscriptions.

**Solution:** inspect channel status/error and `supabase_realtime` membership for the exact table. Confirm the same signed-in user can SELECT the row. Check subscription cleanup on unmount/signout and refetch after readiness/reconnect. Do not publish census data or use privileged keys as a workaround. [Realtime setup](02-installation-and-environment-setup.md#10-supabase-realtime--optional-p2).

**Verification:** staff update reaches only allowed citizen sessions once; reconnection refetch restores current data; normal manual refresh works with Realtime disabled. If deferred, record N/A.

### Push, email or Cron does not run

**Problem:** optional notification is missing, email rejected or scheduled deadline change never appears.

**Possible Cause:** permission/HTTPS/service-worker/VAPID problem; provider sandbox/rate/sender restriction; disabled Cron job, UTC mismatch, paused project or failed SQL run.

**Solution:** diagnose the specific service using [push/email setup](02-installation-and-environment-setup.md#11-web-push-and-email-notifications--optional-p2) or [Cron setup](02-installation-and-environment-setup.md#12-supabase-cron--optional-p2). Inspect worker/server/provider/job history without logging secrets. Test one controlled event, avoid unbounded retries and remove stale subscriptions. Defer the enhancement if it threatens core testing; persisted tracking must remain available.

**Verification:** one authorized test completes, repeated attempts do not duplicate processing, and a service failure does not roll back the saved report/request. Unimplemented features are N/A.

## Vercel and runtime failures

### Deployment fails at install or build

**Problem:** Vercel fails although development mode ran locally.

**Possible Cause:** wrong root/Node version, inconsistent lockfile, missing committed file, filename case difference, legacy backend import or missing build-time variable.

**Solution:** read the first substantive error in build logs. Compare Node 24, repository root, lockfile, variable scopes and exact commit. Run local `npm.cmd ci`, lint, typecheck and build against the intended environment after preserving local changes. Check case-sensitive imports and tracked files. Keep the default Next output; do not convert an Auth/server app to static export. [Vercel setup](02-installation-and-environment-setup.md#13-vercel).

**Verification:** the same reviewed revision builds locally and in Vercel with no ignored type/permission errors.

### Deployment is Ready but pages fail at runtime

**Problem:** homepage loads but protected pages return 500, login loops, uploads fail, or data does not persist.

**Possible Cause:** missing Production environment, stale embedded public values, wrong Supabase project/redirects, old MySQL consumer, runtime exception or private Storage policy failure.

**Solution:** reproduce in a fresh session on the stable HTTPS domain while inspecting browser Network and Vercel runtime logs. Identify the failing route/action, compare variables/scopes without printing values, and follow the relevant Auth/RLS/Storage diagnostic above. Redeploy after public variable changes. A green build cannot verify runtime permissions. Keep exception details in server logs and show a useful safe user message.

**Verification:** deployed report/service submission, staff update, citizen reload, private file and restricted census/matching all pass; citizen B's negative tests still deny access.

### UI reports success but nothing was saved, or submission duplicates

**Problem:** a success toast appears without a record, or retry/double-click creates repeated records.

**Possible Cause:** a legacy demo handler remains, an asynchronous operation/error was ignored, success was shown before photo finalization, or submission lacked duplicate protection.

**Solution:** trace the real mutation through Network/server logs and query persistence as the owner. Return success only after the database operation and any selected-file finalization succeed. Disable the button while pending and retain one UUID `submission_key` per deliberate form attempt, enforce unique `(citizen_id, submission_key)`, and return the owned saved record on retry rather than inserting it again; import upserts use unique `external_ref`. Do not swallow SDK error objects or confuse zero returned rows with a confirmed update.

**Verification:** reload and a new session show the saved record; failed requests show errors; rapid repeat/retry does not create unintended duplicates. Regression-test the original trigger before closing the defect.

If the error remains after a focused 20–30 minutes, give the module owner/reviewer the exact failing test, sanitized message, role, environment, last working revision and smallest reproduction. Do not spend the remaining testing window on repeated installs or broad permission changes.
