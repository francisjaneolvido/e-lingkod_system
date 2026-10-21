# 02 — Installation and environment setup

[README](../README.md) · [Prerequisites](01-prerequisites.md) · [Troubleshooting](07-troubleshooting.md)

Use Windows 10/11 and PowerShell. All application commands run from the project root, beside `package.json`. Installer downloads and cloud settings use a browser. SQL blocks run in **Supabase Dashboard → SQL Editor**, never PowerShell.

**Execution boundary:** every command below is for the development team to run later. The documentation author inspected source and package metadata but did not install packages, configure cloud projects, run the application, or deploy it. Dashboard labels may move; follow the linked official page when the current UI differs.

## Setup order and working directory

1. Verify Node/npm and Git, then repository access (sections 1–3).
2. Restore the existing application dependencies and inspect its startup (4–5).
3. Create the hosted Supabase project and agree on migrations/roles (6–7).
4. Complete the existing-project migration checkpoint below.
5. Configure and verify private storage and maps (8–9).
6. Defer Realtime, push/email and Cron (10–12) until core workflows pass.
7. Set up Vercel early; repeat its production checks after integration (13).
8. Sign off the environment gates (14).

Open PowerShell and confirm the root before running any project command:

```powershell
Set-Location -LiteralPath 'C:\Users\Kyle.Apolinario\OneDrive - Inchcape\KYLE\YESEL\e-lingkod_system'
Get-Location
Test-Path -LiteralPath '.\package.json'
Get-ChildItem -Force
git status --short
```

`Test-Path` must return `True` for this existing checkout. A teammate cloning elsewhere uses their own checkout path in the first command. Keep paths with spaces quoted. Do not run npm in `C:\Windows\System32`, inside `src`, or inside a ZIP archive.

## Existing-project migration checkpoint

The checkout is not an empty Supabase starter. It contains MySQL/Prisma/Better Auth configuration and imports in `src/lib/auth.ts`, `src/lib/prisma.ts`, auth forms, the catch-all auth handler, account pages, dashboard redirects and landing/header components. There is no inspected Supabase client implementation. Setting new environment variables will not reroute those imports.

During Day 1, Developer 1 coordinates an implementation PR, Developer 3 reviews the data/access rules, and Developer 2 checks the shared UI. This is planned development work, not a completed part of this handoff.

1. Establish a clean starting commit and use the D1-owned shared branch `chore/supabase-foundation`. Preserve the landing UI, image assets, brand guide and existing component preset.
2. Add only missing Supabase packages after section 6. Build the browser/server clients and Next 16 session refresh proxy using section 7's official references.
3. Replace Better Auth calls in registration, login, logout, account pages, layout/header personalization and protected routes. Preserve safe same-site redirect validation from `src/lib/auth-redirect.ts`.
4. Replace the old `/api/auth/[...all]` integration with the selected Supabase email confirmation/callback routes. Keep one authentication authority; a Better Auth cookie does not authenticate Supabase requests.
5. Create `profiles`, default new users to `citizen`, and establish reviewed role/RLS policies before adding feature tables. Recreate synthetic demo accounts in Supabase; do not copy password hashes or invent a real-user migration.
6. Search for remaining imports of `@/lib/auth`, `@/lib/prisma`, `better-auth`, and generated Prisma code. During implementation, remove obsolete runtime dependencies only after all consumers have been converted. Do not run Prisma migrations against Supabase.
7. Verify registration or controlled account creation, login, refresh, signout, protected-route denial, citizen A/B isolation and staff access. Lint, typecheck and build must pass on the migrated branch.
8. Merge this small shared foundation before feature branches depend on authentication. Record the schema version, exact package changes and observed checks in the PR. Freeze the validation, file-byte limit and `submission_key` rules from the architecture guide before parallel forms are built.

No application files, `.env` files, SQL migration files or dependencies were changed for this documentation task. The existing [MySQL guide](../SETUP-MYSQL-AUTH.md) is retained as historical context; it is not a second setup path for this MVP.

## 1. Node.js and npm

### Prepare and install

Node runs the development/build process. npm is included with its installer. Prerequisites are a supported Windows machine, download access and installer permissions; an IDE is already installed.

1. Open the official [Node.js download page](https://nodejs.org/en/download). Select **24.x LTS**, Windows and the correct architecture (usually x64; use ARM64 only on an ARM machine). The review environment reported 24.21.0, but choose the latest supported 24.x security patch at setup time.
2. Download the Windows `.msi`. Keep **Node.js runtime**, **npm package manager** and **Add to PATH** enabled. The optional native compilation tool installation is not needed for the selected SDK/map packages.
3. Finish the installer. Close all PowerShell terminals and restart the IDE if it was already open; processes retain their old PATH until restarted.
4. In a new terminal, run:

```powershell
node --version
npm.cmd --version
Get-Command node
Get-Command npm.cmd
where.exe node
```

Successful behavior is a Node `v24.x.x` version, an npm version, and a command path belonging to the intended installation. Version numbers alone do not prove the application builds.

### Configure, diagnose and finish

Use Node 24 for all three developers and select 24.x in Vercel. Do not add a version manager solely for this week. If one is already installed, ensure it selects the same major and does not shadow the MSI installation.

- **`node` is not recognized:** restart the terminal, then check `Test-Path 'C:\Program Files\nodejs\node.exe'`. If it exists, inspect Windows Environment Variables → Path for `C:\Program Files\nodejs\`. Repair the installer/PATH rather than reinstalling unrelated tooling. `where.exe node` reveals duplicate installations.
- **`npm.ps1 cannot be loaded`:** run `npm.cmd` and `npx.cmd`, as used throughout this guide. Changing machine execution policy is unnecessary.
- **Old version after installation:** use `where.exe node`; correct the earlier PATH entry or the existing version manager selection, then open another terminal.

More diagnostics: [Node/PATH/PowerShell](07-troubleshooting.md#node-npm-and-powershell).

- [ ] Node 24 LTS resolves from the intended location.
- [ ] Bundled npm runs through `npm.cmd`.
- [ ] All developers have recorded the same Node major.

## 2. Git

### Prepare and install

Git maintains local history; GitHub hosts the shared repository. Before setup, have a GitHub account, a repository invitation, and permission to install Git on the computer.

1. Download a maintained build from [Git for Windows](https://git-scm.com/install/windows).
2. Select the option that allows Git from the command line and third-party software. Keep Git Credential Manager enabled. Keep the team's agreed Windows checkout/Unix commit line-ending setting; do not reformat the whole repository.
3. Choose an already-installed editor for Git prompts. Restart PowerShell after installation.
4. Set identity to your own name and a GitHub-associated address (or your GitHub-provided noreply address):

```powershell
git --version
git config --global user.name 'Your Name'
git config --global user.email 'your-github-email@example.com'
git config --global --get user.name
git config --global --get user.email
git config --show-origin --get credential.helper
```

Replace the example identity; it is not a login credential. These commands configure future commits, not access permissions.

### Authenticate and verify

Use HTTPS and the bundled Git Credential Manager. The first private clone/fetch prompts a browser sign-in; choose the correct GitHub account and complete any two-factor check. GitHub account passwords are not accepted as Git HTTPS passwords. Do not put a token in a clone URL. See [GitHub's credential guidance](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git).

From the existing root, `git rev-parse --show-toplevel` must identify this repository. After configuring its remote in section 3, `git ls-remote origin` must list remote references without an authentication error. An empty new remote can return no references without failing.

If Git is unavailable, reopen the terminal and check `where.exe git`. A usual installer location is `C:\Program Files\Git\cmd`. If access fails, verify the invitation and browser account before clearing credentials. For stale credentials, remove only the relevant GitHub entry in Windows Credential Manager, then fetch and sign in again.

- [ ] Git resolves from PATH.
- [ ] Commit identity is correct.
- [ ] HTTPS authentication succeeds for the intended repository.

## 3. GitHub and the daily repository workflow

### Prepare the shared remote

The owner should reuse the project's existing remote if present. Check in PowerShell:

```powershell
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
```

Do not run `git init` here: `.git` already exists. If there is no GitHub repository, the owner creates an empty repository in the GitHub website and invites the other two developers. Do not add a second web-created README/history to an already populated local repository. No repository or remote was created by this documentation task.

Only if `origin` is absent, set the actual repository URL:

```powershell
$repositoryUrl = 'https://github.com/OWNER/REPOSITORY.git'
git remote add origin $repositoryUrl
git ls-remote origin
```

Replace `OWNER/REPOSITORY` before executing. If an existing `origin` is demonstrably wrong, use `git remote set-url origin $repositoryUrl` after checking the team's intended repository. Do not change a teammate's correct remote.

### Clone only on a computer without a checkout

The current workspace is already a checkout; **skip cloning here**. On a new teammate's computer, choose the intended parent directory and clone into an absent destination:

```powershell
Set-Location -LiteralPath 'C:\path\to\approved-parent'
$repositoryUrl = 'https://github.com/OWNER/REPOSITORY.git'
git clone $repositoryUrl e-lingkod_system
Set-Location -LiteralPath '.\e-lingkod_system'
git remote -v
git status
```

Use your real parent path and URL. An existing nonempty destination is not repaired by cloning over it. [Official clone procedure](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository).

### Branch, commit, push and review

Examples assume the agreed integration branch is `main`; confirm the actual default branch in GitHub before using these commands. Start only with a clean worktree or deliberately committed owned work.

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/civic-reporting
```

Use your module's branch name from the [architecture guide](03-project-architecture.md). Implement one small slice, run the pre-merge checks, then stage named files rather than blindly adding the entire folder:

```powershell
git status --short
git diff --check
git add -- 'src/features/civic-reporting' 'src/app/(citizen)/reports'
git diff --cached --stat
git diff --cached
git commit -m 'feat: add citizen report submission'
git push -u origin feat/civic-reporting
```

The paths above are **planned examples** and work only once those files exist. Inspect the staged diff for secrets and unrelated changes. Open a GitHub pull request into `main`, describe the behavior, migration needs, tests and screenshot if useful. One teammate reviews; the author fixes comments, then the nominated integrator merges. No direct pushes to `main` except the initial repository preparation if needed. Enable available branch protection, or enforce the same PR rule manually where the plan lacks it.

Pull after a merge before starting the next slice. To integrate updated `main` into your own in-progress feature branch:

```powershell
git fetch origin
git merge origin/main
```

If conflicts occur, `git status` names the files. Open each, resolve `<<<<<<<`, `=======`, `>>>>>>>` sections with the other owner, then stage only resolved files, run checks and `git commit`. `git merge --abort` cancels an unfinished merge when you need to return to the pre-merge state. Do not use force-push, reset-hard or blanket “take ours/theirs” to resolve shared work. See [GitHub conflict guidance](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line).

### Environment files and ignores

The current `.gitignore` already ignores `node_modules`, `.next`, build output, logs, `.vercel`, and `.env*`. Preserve those rules. If developers later add a sanitized `.env.example`, explicitly allow it with `!.env.example`; this documentation task does not create one. Never place a database password, private VAPID key, SMTP/API secret, Supabase secret key, or citizen data in it.

Before each push:

```powershell
git check-ignore .env.local
git ls-files -- '.env*'
git diff --cached
```

The first should identify `.env.local` as ignored. The second should list no secret-bearing env files. An ignored file already tracked stays tracked: coordinate removing it from the index with `git rm --cached -- .env.local`, **rotate exposed secrets**, and follow [GitHub's sensitive-data removal procedure](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository). A later deletion does not remove exposure from history.

**Completion:** all three developers can fetch/push an owned branch; the default branch, review cycle, ignore rules and lockfile owner are agreed. For rejected pushes or conflicts, use [Git troubleshooting](07-troubleshooting.md#git-authentication-and-collaboration).

## 4. Next.js, React and TypeScript

### Existing application: restore, do not scaffold

Prerequisites: Node/npm, Git access, correct root, and the committed `package-lock.json`. Review `package.json` before installing. It already supplies Next.js, React, React DOM, TypeScript, ESLint, Tailwind and UI helpers.

The following commands are for the **later development setup**, not this documentation task:

```powershell
Get-Content -LiteralPath '.\package.json'
npm.cmd ci
npm.cmd ls --depth=0
npm.cmd ls next react react-dom typescript eslint-config-next
npm.cmd run dev
```

`npm ci` uses the existing lockfile and fails rather than silently updating inconsistent dependency declarations. It replaces `node_modules`; stop the dev server first. On a first checkout, the application may fail when legacy auth tries to use missing MySQL settings. Treat that as evidence that the migration checkpoint is still open, not as a reason to install MySQL for this target stack.

Open the local URL actually printed by Next.js, normally `http://localhost:3000`. Check `/`, `/login` and `/register`, while distinguishing rendered forms from working target authentication. Stop the server with Ctrl+C before a clean production build.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Success means each command exits with code 0 and the built routes render when started. The existing `lint`, `typecheck`, `build`, `dev`, and `start` scripts are present. There is no inspected automated `test` script. `next build` does not replace linting in Next 16. See [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

If port 3000 is occupied, first stop the duplicate process in its terminal. To intentionally use another port:

```powershell
npm.cmd run dev -- --port 3001
```

Match the local site origin and Supabase redirects to `http://localhost:3001`. Do not force-stop an unidentified process. Use the [port diagnostic](07-troubleshooting.md#nextjs-installation-and-build).

### Initialization reference — skip in this checkout

For a genuinely empty approved application root, the official App Router initialization is shown below **for reference only**. This repository already has source, configuration, docs and Git history. Do not run either command here or generate another app inside it.

```powershell
# Alternative A: plain starter, only in a genuinely empty approved root
npx.cmd create-next-app@latest . --use-npm --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --disable-git
```

The dot targets that empty root; `--disable-git` avoids implicitly creating Git history. Choose TypeScript, App Router, Tailwind and the `@/*` alias. An official Supabase-enabled alternative supplies cookie Auth helpers, TypeScript and Tailwind:

```powershell
# Alternative B: Supabase starter instead of A, never on top of it
npx.cmd create-next-app@latest . --example with-supabase --use-npm --disable-git
```

A starter may organize files without `src`; inspect its actual structure before adapting paths. In this project, adapt the official Supabase helpers into the existing `src` tree instead. [CLI options](https://nextjs.org/docs/app/api-reference/cli/create-next-app), [Supabase starter](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).

### Compatibility and failures

Keep Next 16.4.2 and matching `eslint-config-next` unless an official fix requires a reviewed update. At review, React/DOM 19.3.1 was the stable patch while the checkout had 19.3.0. One maintainer may align both in the setup PR after checking metadata and changes:

```powershell
# Maintainer only, later: changes package.json and package-lock.json
npm.cmd install react@19.3.1 react-dom@19.3.1
```

Do not run this independently on every branch. Record the resulting lockfile and rerun checks. `ERESOLVE` requires reading the conflicting package's peer requirements; forcing installation hides the cause. `ENOENT package.json` means wrong directory. `npm ci` lock mismatch goes to the lockfile owner; do not delete the lockfile to make it disappear.

The existing `next.config.ts` enables Cache Components and partial prefetching. Authenticated reads must follow current request-time/Suspense rules and must not be wrapped in shared `use cache` scopes. The [local AGENTS instructions](../AGENTS.md) ask implementers to read version-local Next docs after dependencies exist; use official web docs if that directory is absent. Build problems are covered in [Next/TypeScript troubleshooting](07-troubleshooting.md#nextjs-installation-and-build).

- [ ] Locked dependencies restored without peer overrides.
- [ ] Framework/declaration versions inspected; any patch alignment reviewed once.
- [ ] Landing UI starts or a specific legacy-auth blocker is recorded and assigned.
- [ ] After the migration checkpoint, lint/typecheck/build and route smoke checks pass.

## 5. Tailwind CSS and shadcn/ui

### Inspect and configure

Prerequisites: working dependency installation and existing components. This checkout already has Tailwind 4 imports, theme variables, a Turbopack CSS rule, and `components.json` pointing to `src/app/globals.css`. Inspect them before adding anything:

```powershell
Get-Content -LiteralPath '.\components.json'
Get-Content -LiteralPath '.\next.config.ts'
Get-Content -LiteralPath '.\src\app\globals.css' -TotalCount 45
Get-ChildItem -LiteralPath '.\src\components\ui'
npm.cmd ls tailwindcss @tailwindcss/turbopack shadcn @base-ui/react
```

1. Reuse existing button/input/label/card/badge/separator components.
2. Keep `base-nova`, Base UI behavior, the `@/*` alias to `src/*`, CSS variable bindings and [brand rules](../BRAND-AND-UI-GUIDE.txt).
3. Only in a checkout missing `components.json`, initialize with `npx.cmd shadcn@latest init` after confirming Tailwind and aliases. Do **not** rerun initialization here.
4. During implementation, add only components needed for accepted forms. One shared UI owner can add missing select, textarea, table, dialog and alert components:

```powershell
# Later, from the root; review generated source and dependency changes
npx.cmd shadcn@4.22.1 add select textarea table dialog alert
```

Skip components already present; do not accept overwrite prompts without comparing the existing source. shadcn copies source into the repository; it is not a single opaque component library. [Existing-project installation](https://ui.shadcn.com/docs/installation/next), [configuration](https://ui.shadcn.com/docs/components-json).

For a new plain starter only, the official Tailwind 4 Next guide uses `tailwindcss`, `@tailwindcss/postcss`, `postcss`, an `@tailwindcss/postcss` PostCSS plugin and `@import "tailwindcss"`. That is an alternative pipeline, **not an additional step for this checkout's existing Turbopack setup**. Do not run Tailwind 3's `tailwindcss init -p` here. [Tailwind guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

### Verify and finish

On the form being developed, confirm spacing/color classes render, inputs have labels, a dialog closes with Escape, and focus is visible by keyboard. Run lint/typecheck/build after generated component changes. Missing styles usually indicate the CSS import/layout link or pipeline; alias errors point to `tsconfig.json`/`components.json`. Wrong component props can indicate Base UI versus Radix examples. [UI troubleshooting](07-troubleshooting.md#tailwind-shadcn-and-typescript).

- [ ] Existing CSS pipeline and Base UI preset preserved.
- [ ] Only needed missing components added and reviewed.
- [ ] Rendered styles and keyboard behavior checked; build passes.

## 6. Supabase PostgreSQL

### Create the hosted project

Prerequisites: owner account, agreed project name/region, synthetic-data policy, and a named migration coordinator (Developer 3). Use hosted Supabase; no local PostgreSQL installation, Docker, database driver or CLI is required.

1. Sign in at [Supabase Dashboard](https://supabase.com/dashboard) and create a project in the team's organization. Choose the Free plan if its current limits fit and a reachable region near the team.
2. Generate a unique database password and keep it in the owner's password manager. This password is for administrative database access; it is not the publishable API key and is not needed in the Next.js client environment.
3. Wait for provisioning. Confirm the project is active and the SQL Editor/Table Editor open. Invite developers using separate accounts; do not share the owner password.
4. In the project's Connect/API settings, copy the Project URL and **publishable key**. Use the HTTPS project URL, not the PostgreSQL connection string or Dashboard URL.
5. Confirm the Data API is enabled for the intended schema. Expose only reviewed tables/functions, with explicit grants and RLS. [Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs), [API keys](https://supabase.com/docs/guides/api/api-keys).

### Configure local environment and missing packages

In the existing project root, use the existing editor to create `.env.local` later. Do not overwrite an existing secret file. Adapt it to the approved backend without sharing its contents. The safe template is:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Replace all three values with the real project/origin before starting. Use plain `KEY=value` lines, not PowerShell `$env:` syntax, and ensure the filename is not `.env.local.txt`. Never prefix a secret key with `NEXT_PUBLIC_`. The publishable key is designed for the browser; security comes from Auth, grants and RLS. Secret/service-role keys bypass protections and are not required for the core request flow.

Next loads root `.env.local` itself. No extra dotenv package/configuration is needed for the target app. Restart the dev server after edits; public variables are embedded at build time, so hosting changes require a new deployment. [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables).

After the maintainer rechecks version metadata, add only the missing target libraries in the shared setup PR:

```powershell
# Later setup step; SDK 2.118.0 requires Node >=22, use 24 LTS
npm.cmd install @supabase/supabase-js@2.118.0 @supabase/ssr@0.12.7
npm.cmd ls @supabase/supabase-js @supabase/ssr
git check-ignore .env.local
```

Do not also install deprecated `@supabase/auth-helpers-nextjs`. SDK/SSR compatibility is recorded in [prerequisites](01-prerequisites.md).

### Prepare schema and migration workflow

The [architecture guide](03-project-architecture.md) is the field/access contract, not a pre-existing schema. During implementation:

1. Developer 3 coordinates reviewed PostgreSQL migration files under planned `supabase/migrations/`. Include table constraints, indexes, grants and RLS in the same change.
2. Apply approved files in timestamp order using the Dashboard SQL Editor. Keep application history in the planned migration ledger described in the architecture guide; record filename/checksum/application time in the PR. Manual Dashboard execution does not populate the Supabase CLI migration history automatically.
3. Build `profiles` and trusted role checks first, then directories/service types, incident/service/worker/job tables. Seed only labeled synthetic/reference fixtures.
4. Enable RLS on every exposed application table. Grant only needed operations to `anon` and `authenticated`, then define operation-specific policies. A successful dashboard query is not an RLS test: dashboard SQL runs with elevated privileges.
5. Citizens may insert/read their own reports/requests. They may not set staff roles, change owner IDs, update workflow status directly, or access another citizen's records. Staff/admin may perform authorized operations; worker rows remain staff/admin-only.
6. Test using actual signed-in citizen A, citizen B and staff sessions with the publishable client. Missing grants can cause permission errors before policies run; missing SELECT permission may hide even a successful insert. [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

Do not paste a generic “allow all” policy to clear an error. RLS filters rows; it does not by itself stop a user from changing a protected column on an allowed row. The role and status write paths need restricted privileges or narrowly scoped database functions, as documented in architecture.

### Verify database access in two stages

First, in **Dashboard SQL Editor**, run this read-only administrative check:

```sql
select current_database(), current_timestamp;
```

It should return one row. This establishes dashboard database availability only.

Second, after the profile migration and SSR clients exist, use the app's authenticated profile read. Expect exactly the current user's profile, with the correct role. Create a synthetic report in the first feature slice and verify it persists after reload; in citizen B's session, querying that report must return no private row. Verify a rejected write too. Do not create a public diagnostic route that exposes credentials or arbitrary tables just to prove connectivity.

### Failures and completion

- **Invalid API key:** confirm URL/key belong to the same project and the value is a publishable key, not a database password; restart/redeploy.
- **Connection/fetch failure:** check active project, DNS/network, HTTPS project host, browser Network status and Supabase service status.
- **Empty result or `42501`:** inspect schema/grants/RLS, session user and selected row ownership. Do not disable RLS. Use [Supabase diagnostics](07-troubleshooting.md#supabase-connectivity-authentication-and-rls).
- **Missing relation/schema-cache error:** verify the intended migration ran against the same project and exact table name; coordinate a schema cache refresh only after confirming it exists.

- [ ] Project active; correct connection details; `.env.local` ignored.
- [ ] Missing SDK/SSR packages added once and locked.
- [ ] Migration order/ledger and rollback approach documented in the implementation PR.
- [ ] Authenticated application read/write and cross-user denial verified, beyond Dashboard access.

## 7. Supabase Auth and application roles

### Configure email/password and redirects

Prerequisites: active project, profile/role contract, SDK/SSR packages and the migration implementation branch. Authentication answers **who signed in**; authorization answers **which rows/actions that identity may access**. Supabase organization membership and the database's `authenticated` role are not LGU staff authorization.

1. In Authentication provider settings, enable Email/password. Keep a documented password policy; use unique test passwords and never put demo passwords in Git.
2. Choose the email confirmation strategy explicitly. For this synthetic, limited class demo, the simplest path is controlled pre-created, confirmed accounts through the Dashboard. If registration is demonstrated without confirmation, disable confirmation deliberately in the dedicated demo project and label accounts unverified; do not present that choice as verified citizen identity.
3. If email confirmation remains on, configure custom SMTP or test only authorized recipients under the default sender. Implement the official token-hash confirmation route and email template before expecting signup links to work. Auth mail setup is described in section 11. [Password Auth](https://supabase.com/docs/guides/auth/passwords).
4. In Authentication → URL Configuration, set the local **Site URL** to `http://localhost:3000` while developing. Add exact local confirmation/callback URLs implemented by the team, such as `http://localhost:3000/auth/confirm` and `http://localhost:3000/auth/callback`. Change both port and allow-list entries if using 3001.
5. At deployment, change Site URL to the stable Vercel production origin and allow exact production callback/confirm URLs. Keep local entries for development. A URL allow-list entry does not create a route. Limit preview entries to deliberate test deployments; avoid broad production wildcards. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

### Implement cookie sessions in the existing app

Use the [current Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs) for the actual helper code; adapt its paths to `src/lib/supabase`. Required pieces are a browser client, an async per-request server client and `src/proxy.ts` session refresh on Next 16. Preserve refreshed cookies and response cache headers when returning redirects. Do not mix browser local-storage authentication with unrelated Better Auth cookies.

On the server, verify identity with `getClaims()` or `getUser()` as appropriate. Do not use the user object from `getSession()` alone as authorization proof. Load the trusted profile role before every staff mutation, and retain RLS underneath. Personalized pages and responses that set session cookies must not enter a shared public cache.

Registration creates a profile with role **`citizen`**, regardless of submitted metadata. The owner provisions the first `admin` through a privileged Dashboard operation after confirming the Auth UUID and profile. Only authorized administration may assign `staff`/`admin`; the registration form offers no role selector. Profiles use `auth.users.id`; passwords remain solely in Supabase Auth. For this MVP, staff/admin can manage census records, while citizens/public cannot read individual rows.

To provision the controlled demo accounts, the project owner:

1. Opens Authentication → Users and uses the supported create-user action rather than an email invitation when SMTP is deferred. Create citizen A, citizen B, staff and a separate admin demo account with synthetic labels/owned test addresses and unique private passwords; confirm accounts using the supported dashboard option if confirmation is bypassed for the demo.
2. Copies each Auth UUID and checks that exactly one `profiles` row exists with that `id`. A missing profile means the trusted provisioning/trigger path needs repair; do not give a user another account's profile ID.
3. Uses the privileged Dashboard Table Editor on `profiles`, filters by the exact staff UUID and changes its role from `citizen` to `staff`. Do the same for the controlled admin UUID with `admin`; leave both citizen accounts as `citizen`. This is an owner-only bootstrap operation, not a public application feature.
4. Saves and verifies the affected row, then signs in through the application with each account and runs the positive/negative access checks. Keep passwords in a private password manager/channel; recording account labels and roles is enough for the test log.

The role column needs protection independent of row ownership: revoke client role updates, expose only safe profile fields for self-service, and use a protected administrative operation for role changes. Do not trust `user_metadata.role`, hidden fields or a client-supplied owner ID.

### Verify and diagnose

Create separate synthetic accounts for citizen A, citizen B and staff. Record their labels/roles in the private team test record, not their passwords in documentation.

1. Sign in as citizen A; refresh the page and open another tab. A valid cookie-backed session remains recognized.
2. Sign out; navigate directly to a protected URL and attempt the underlying mutation. Both must be denied appropriately.
3. Sign in as citizen B; verify A's records cannot be read even with a copied URL/ID.
4. Confirm a citizen receives a clear denial at a staff URL and cannot elevate their profile role through a direct request.
5. Sign in as staff; verify authorized review pages work. Change a test role through the approved admin path and ensure subsequent server operations respect it.
6. If confirmation is enabled, use an owned mailbox, verify the callback creates a session, and test an expired/used link without an infinite redirect loop.

**Login succeeds but page denies access:** compare the Auth UUID to `profiles.id`, role spelling, SSR cookie propagation and RLS. **Email never arrives:** inspect Auth logs/SMTP recipient restrictions before resending. **Redirect loop:** inspect the actual callback URL, route implementation and proxy exclusions for `/login`, `/register`, `/auth/confirm` and `/auth/callback`. Further steps: [Auth troubleshooting](07-troubleshooting.md#supabase-connectivity-authentication-and-rls).

- [ ] Existing Better Auth runtime paths replaced in a reviewed implementation PR.
- [ ] Account creation/confirmation policy and local/production redirect list recorded.
- [ ] Refresh/signout and server-side protection verified.
- [ ] Citizen isolation, staff access and role-escalation denial verified.

## 8. Supabase Storage

### Create private buckets

Storage holds files; PostgreSQL holds their object paths and parent relationships. Prerequisites: working Supabase Auth, an owned incident/request row, and the database policies from section 6. A dashboard upload alone does not prove that citizen uploads are authorized.

1. Open Storage in the correct project and create **`report-photos`** with public access **off**.
2. Set a **5 MB (5,000,000 bytes)** per-file application/bucket limit and allow `image/jpeg`, `image/png`, `image/webp`. The app accepts one optional photograph per report; the upload capability itself is P0.
3. Only if optional service attachments are implemented, create private **`service-documents`**, limit **5 MB**, allow `application/pdf`, `image/jpeg`, `image/png`. Do not accept executable files, SVG, HTML, ZIP or arbitrary extensions.
4. Apply reviewed `storage.objects` policies for each enabled bucket. Configure bucket limits through the Dashboard; never edit Supabase's managed Storage tables as an application upload method. [Bucket creation/restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets).

### Configure access and upload flow

The proposed object key is `auth.uid()/parent_id/random.ext`; store the bucket-relative path, not a public URL. Use a generated filename and `upsert: false`. A folder prefix alone is insufficient: policies must check the uploader's identity, the owned parent row, the exact server-reserved `photo_expected_path`, and its `pending` upload state. This prevents extra objects under an otherwise owned parent. Finalized reads match `photo_path`; private owner reads for finalization match the reserved path. Read policies allow the parent owner and authorized staff/admin. Limit deletion to authorized cleanup paths; do not grant bucket-wide access to everyone signed in. [Storage policies](https://supabase.com/docs/guides/storage/security/access-control).

Keep the request lifecycle explicit during implementation:

1. Validate report fields and selected file size/type before creating the parent. Server-side validation remains required even when the form checks them.
2. Create the owned incident using the stable `submission_key` retry contract. When a photo is selected, generate/reserve `photo_expected_path` on the server and set `photo_state=pending`, with `photo_path` still null; otherwise use `none`. The generated tracking ID is unique, but do not show submission success while a selected file is still pending.
3. Upload directly from the authenticated browser to its authorized private object path. This avoids routing a 5 MB file through a Server Action's default 1 MB body limit. Direct browser upload still uses Supabase RLS; it does not need a secret key.
4. Finalize through a protected server operation: verify parent ownership, exact path, file existence, size and actual allowed file content before saving `photo_path`, clearing `photo_expected_path`, and setting `ready`. Browser MIME/extension checks alone are not proof of content.
5. On failure, show a retry message and set `failed` or clean up the owned incomplete parent/object according to the agreed flow. Reuse the parent on retry, reauthorize it and set a reserved path/`pending` before uploading. An explicit Continue without photo action removes the owned incomplete object, clears both path fields, sets `none`, and completes the same report. Staff lists show only complete `none`/`ready` submissions. Clean orphan files; do not claim database and Storage operations are one transaction.

Keep signed download URLs short-lived (for example 60 seconds), generate them only after access checks, and regenerate them when needed. Do not save signed URLs in the database or publish private photos with `getPublicUrl`. Configure `next/image` remote hosts only if using it; for the first private preview a normal authorized image URL is sufficient. [Private serving](https://supabase.com/docs/guides/storage/serving/downloads), [Server Action body limit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

### Verify, diagnose and finish

Once the uploader exists, sign in as citizen A and submit one small JPEG with a report. Reload its details and verify the preview still works. Use citizen B and a signed-out browser to request the same object; both must be denied. Test a 6 MB file, wrong type, copied parent ID, failed network upload, duplicate click, expired signed URL, and staff read. Optional documents receive the same checks only if implemented.

Upload denial commonly comes from a missing INSERT policy, wrong bucket/path or a JWT from the legacy Auth system. An overwrite conflict is avoided by fresh random paths rather than granting broad UPDATE permissions. A 413 error may come from the app/proxy body limit, not the bucket. Use Network request URLs/statuses to identify the failing layer. [Storage troubleshooting](07-troubleshooting.md#storage-and-upload-failures).

- [ ] Required photo bucket is private, limited and protected by parent-aware policies.
- [ ] Report photo upload/read works; another citizen cannot access it.
- [ ] Pending/failure/retry behavior does not show false success or duplicate reports.
- [ ] Optional documents are either verified or explicitly marked not implemented.

## 9. Leaflet, React Leaflet and OpenStreetMap

### Install only missing map packages

Prerequisites: React 19, working client components, location fields in the report contract, and internet access to tiles. Map rendering and browser GPS are separate capabilities: neither requires Supabase Realtime.

```powershell
# Later setup, from the project root
npm.cmd install leaflet@1.9.4 react-leaflet@5.0.0
npm.cmd install -D @types/leaflet
npm.cmd ls leaflet react-leaflet @types/leaflet react react-dom
```

React Leaflet 5's stable peer metadata supports React/DOM 19 and Leaflet 1.9. Do not copy prerelease installation commands from an older documentation example. Import components/types from the `react-leaflet` package entry point. [Installation/types](https://react-leaflet.js.org/docs/start-installation/), [stable peer metadata](https://registry.npmjs.org/react-leaflet/5.0.0).

### Configure browser rendering and location

1. Import `leaflet/dist/leaflet.css` once into the application's global CSS/layout path. Give the map container an explicit height, such as 320 px, and responsive width. Without height, tiles may load into an invisible container.
2. Put interactive map code in a Client Component. Wrap its dynamic import with `ssr: false` **inside a Client Component**, so Leaflet is not evaluated during server rendering. A `use client` marker alone does not prevent all prerender-time browser access. [Next lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).
3. Use the standard tile URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with visible OpenStreetMap contributor attribution. Do not prefetch/bulk-download tiles or disable normal caching. This community service has no guaranteed availability; it is suitable for light demonstration traffic only under its policy. [Leaflet quickstart](https://leafletjs.com/examples/quick-start/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
4. Set a readable initial viewport for the demonstration area, and let a click/drag place or move a marker. Use an existing imported marker asset or a simple Leaflet `divIcon` if bundled default icon URLs fail. The chosen point is a user-provided location, not a verified property/address.
5. Add a **Use my location** button. Call browser geolocation only after the user requests it, with success/error callbacks and a finite timeout (for example 10 seconds). Validate latitude −90…90 and longitude −180…180 on the server.
6. Permission denial, timeout, missing API and unavailable GPS all lead to the same manual map selection plus location-description fallback. Do not submit a default coordinate silently. Keep typed coordinates available if tiles fail completely.
7. Save the selected latitude, longitude and location label with the report. Use Leaflet's `[latitude, longitude]` order consistently; do not swap it with GeoJSON's longitude-first order.

GPS works on HTTPS or localhost. Opening `http://192.168...:3000` on a phone may load the app while geolocation is unavailable. Use the Vercel HTTPS preview for that check. [Geolocation requirements/errors](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

### Verify, diagnose and finish

Open the report form, hard-refresh, move the marker, allow location once, then revoke permission and select manually. Submit and reload details; saved coordinates must match. Check small-screen touch behavior and map attribution. Errors mentioning `window`/`document` usually mean a server-evaluated map import; gray tiles point to CSS/height/network; a missing pin points to icon asset URLs. [Map troubleshooting](07-troubleshooting.md#leaflet-and-browser-location).

- [ ] Compatible packages/types installed once and locked.
- [ ] Map refreshes without server-render errors and shows attribution.
- [ ] GPS success and denial/manual fallback verified over a suitable origin.
- [ ] Persisted coordinates and location text match the user's selection.

## 10. Supabase Realtime — optional P2

### Enable only after manual tracking works

Realtime updates an open screen; it does not replace database persistence, ownership checks or initial loading. Prerequisites: complete report/request workflows, valid Auth sessions, tested SELECT policies, and time after the core testing gates. No new npm dependency is needed.

1. In the project Dashboard's Realtime/publication settings, add only the implemented `incident_reports` and/or `service_requests` tables to the `supabase_realtime` publication. Confirm the actual table membership; do not assume enabling a UI toggle publishes every table.
2. Keep RLS and SELECT grants in place. Subscribe using the signed-in user's browser client, scoped to a particular owned record or owner ID. A filter reduces traffic; it does not authorize private rows.
3. Listen for the `UPDATE` events needed by status tracking. Register/clean up one channel per mounted view, and remove it on unmount/signout to avoid duplicates.
4. Fetch the current row on initial load and after reconnect/subscription readiness. Events missed while disconnected are not a durable history. Always retain a manual refresh control.
5. Keep worker census, socioeconomic fields and private document metadata out of optional publications. Do not add secret keys to make subscriptions work. [Postgres Changes setup and RLS](https://supabase.com/docs/guides/realtime/postgres-changes).

### Verify, diagnose and finish

Use citizen A's tracking view in one browser and staff in another. Confirm channel readiness, change status as staff, and observe the new value without a reload. Citizen B's subscription to A's report must not expose it. Disconnect/reconnect the first browser and check that a refetch restores current state.

If silent, check the actual channel status/error, project/table/schema, publication membership, event/filter and SELECT policy with that same user. If updates arrive twice, check duplicate effects/channels before changing server configuration. If unresolved in the timebox, disable the subscription and demonstrate reload-based tracking.

- [ ] Implemented, ownership-tested and reconnect-safe; **or** marked not implemented with manual refresh working.

## 11. Web Push and email notifications — optional P2

### Web Push preparation and configuration

Prerequisites: finished core tracking, a supported browser, HTTPS/localhost, explicit user permission, a service worker plan and an owner for notification failures. Defer the feature if those are not ready by feature freeze. Push permission must never be required to submit or track a report.

During implementation only:

```powershell
npm.cmd install web-push
npm.cmd install -D @types/web-push
.\node_modules\.bin\web-push.cmd generate-vapid-keys
```

Generate one VAPID pair per environment and retain it; rotating keys invalidates existing subscriptions. Add the public key to browser configuration and keep the private key server-only:

```dotenv
# Optional; add only when implementing push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:YOUR_OWNED_CONTACT_ADDRESS
```

Replace the subject with a real controlled contact URI. Do not commit keys or paste private output into issues. Follow the [official Next.js push guide](https://nextjs.org/docs/app/guides/progressive-web-apps) when implementing registration, VAPID conversion and sending.

The development work includes a same-origin service worker under planned `public/sw.js`, registering it from a client component, requesting permission after an explicit Enable notifications action, and storing the resulting subscription in a per-user protected table. Handle `push` and notification click events and validate click destinations. Send only after an authorized status change commits. Keep payloads generic; no census details or private document URLs belong in notifications.

Check browser support before showing the opt-in. iOS/iPadOS push needs a supported Home Screen web app, not just an open browser tab. The MVP is still accepted without push on unsupported devices. Handle revoked permission and stale endpoints; remove invalid subscriptions on permanent 404/410 send responses rather than retrying forever.

**Verification:** enable, receive one controlled status test, click its safe destination, unsubscribe and confirm no more delivery. Test denial and a closed page where supported. If permission is blocked, inspect site notification settings and service worker registration/scope in Developer Tools. If subscription works but delivery fails, inspect the server error, VAPID pair/subject, worker events and browser support. Do not expose the private key in logs while diagnosing.

### Auth SMTP versus application email

These are separate integrations:

| Need | Configuration | Expected verification |
| --- | --- | --- |
| Signup confirmation/password reset | Supabase Auth email settings and custom SMTP | Owned mailbox receives Auth link; confirmation/reset route handles valid and expired tokens. |
| Optional report/request status email | Next.js server sender using a provider API or SMTP client | Authorized update commits once; delivery result is recorded without rolling back the saved status. |

For Auth SMTP, create a provider account, verify its sender/domain as required, then copy the provider's **actual** SMTP host, port, user, password and From address into Supabase Authentication email settings. Do not invent server names or use personal mailbox passwords. The default Supabase sender is limited to team-authorized recipients and strict rates; it is not a general mail service. [SMTP setup and limits](https://supabase.com/docs/guides/auth/auth-smtp).

For optional application email, choose a provider only after checking current free quota and sender requirements. For example, the [Resend Node guide](https://resend.com/docs/send-with-nodejs) documents its server API; add its SDK only if selected. A proposed `RESEND_API_KEY` must stay server-only; use a verified sender, not the documentation's sample address. Never call a secret-bearing provider API from the browser. Keep a minimal result/attempt record; at this scale a bounded manual retry is enough, and push/email failure never changes a successful submission into a failure.

**Common failures:** SMTP rejects a recipient → check default-sender restrictions/provider sandbox; message missing → check spam, provider log, verified From domain and Auth rate limits before resending; confirmation opens localhost after deployment → fix production Site URL/template/redirect parameter. Do not promise delivery or verified identity without testing it.

- [ ] Push and application email either pass controlled tests or are marked not implemented.
- [ ] Any retained Auth email confirmation path has working SMTP/allowed recipients and correct callback routes.
- [ ] Notification failure cannot block persistence/tracking; secrets remain server-only.

## 12. Supabase Cron — optional P2

### Activate and configure

Cron can periodically flag overdue synthetic reports. It is not an emergency dispatch scheduler or an official municipal SLA. Prerequisites: accepted deadline rules, UTC `due_at`/escalation fields in a reviewed migration, tested status transitions, and no outstanding core defects. Do not schedule a job against fields/functions that have not been implemented.

1. In Supabase Dashboard, open **Integrations → Cron** and enable the underlying `pg_cron` extension if prompted. The [Cron install/quickstart](https://supabase.com/docs/guides/cron/quickstart) shows the current controls.
2. Create a temporary `elb-demo-cron-check` SQL job running `select 1;` every five minutes (`*/5 * * * *`). This checks scheduling without changing application records.
3. Observe a run in the Dashboard history; then disable/remove the temporary job. Do not leave diagnostic jobs running indefinitely.
4. Only after the implementation is reviewed, create one bounded SQL job invoking the approved deadline operation. Use a documented demo interval/deadline (not a claimed real SLA), update only unresolved due records, and mark each escalation once. Run it twice on the same fixture to verify idempotency.
5. Store timestamps as `timestamptz` and compare in UTC. Display Asia/Manila time to users; do not silently interpret a cron expression as Philippine local time. Keep the job owner/privileges documented.

Use SQL/database functions for this prototype; no Edge Function, extra scheduler, HTTP secret, or Vault setup is needed. If those are introduced later, review their credentials and permissions separately. Supabase recommends short jobs and limited concurrency. [Cron behavior](https://supabase.com/docs/guides/cron).

### Verify, diagnose and finish

In **Dashboard SQL Editor**, inspect scheduling independently of the application:

```sql
select jobid, jobname, schedule, active from cron.job;
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 10;
```

The extension must exist for these views to be available. A scheduled row without a completed run is not proof of execution. If nothing runs, check active project/job, UTC schedule and run history. A failed run needs its actual SQL error resolved; it is not fixed by adding duplicate jobs. Paused free projects are not reliable scheduling infrastructure.

Test one deliberately overdue fixture and one future fixture. Only the overdue unresolved record should be flagged; a second run must not duplicate the flag/notification. Disable the job after the demonstration if the project is left unattended.

- [ ] Cron omitted and marked N/A; **or** extension, run history, UTC rules and idempotent deadline behavior verified.

## 13. Vercel

### Prepare and import

Prerequisites: GitHub access, reviewed code on the agreed branch, an active Supabase project, Node 24 compatibility, and a release owner. Check repository import eligibility early. A production deployment can be prepared on Day 1, but it is not accepted until final application tests pass.

1. Sign in at [Vercel](https://vercel.com/) using the release owner's account. Review [Hobby limits](https://vercel.com/docs/plans/hobby), including private organization collaboration restrictions and non-commercial eligibility.
2. Choose Add New → Project and import the existing GitHub repository. Grant the integration access only to the intended repository.
3. Set Framework Preset to **Next.js**, Root Directory to the repository root (`.`), and production branch to the agreed integration branch, normally `main`.
4. Select **Node.js 24.x** in project build/runtime settings. Keep the standard `npm run build` command and default Next output; do not set a static `out` directory or enable static export for an authenticated server application. Keep the lockfile committed so installs are repeatable. [Next.js hosting](https://vercel.com/docs/frameworks/full-stack/nextjs).
5. Add environment variables through project settings, not Git. Enter raw values, without PowerShell syntax or accidental surrounding quotes.

| Variable | Environment | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Development locally; Preview/Production on Vercel as deliberately selected | Correct Supabase project HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same scopes as the URL | Matching project publishable key |
| `NEXT_PUBLIC_SITE_URL` | Local localhost; Production stable deployment origin; Preview specific test origin if callbacks are tested there | Actual app origin, no callback suffix |
| Optional VAPID/provider keys | Only environments implementing the feature | Controlled credentials; only the VAPID public key uses `NEXT_PUBLIC_` |

The local `.env.local` is not uploaded through Git. Preview and Production settings are separate; do not assume setting one updates the other. Prefer a separate synthetic Supabase project for demo production if the free-project allowance permits it. If sharing one test project, document that preview writes affect the same synthetic data and stop schema changes during release checks.

### Deploy, redirects and fallback

1. Deploy and inspect the install/build log. Resolve the first relevant error rather than retrying blindly.
2. Obtain the stable HTTPS deployment origin. Set production `NEXT_PUBLIC_SITE_URL`, Supabase Auth Site URL, and exact implemented `/auth/confirm`/`/auth/callback` redirect URLs.
3. Redeploy after environment changes, particularly `NEXT_PUBLIC_` values embedded into browser bundles. Test on the stable domain; preview URLs are distinct origins with distinct cookies/permissions.
4. After the first setup, pushes/PRs can trigger builds according to the Git integration. Keep production updates through reviewed changes. See [Vercel environment variables](https://vercel.com/docs/environment-variables) and [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).

If a private organization import is blocked by the selected plan, do not make the repository public or share credentials. The release owner can evaluate a **CLI deployment of the reviewed local checkout** under an eligible personal project. This is a later optional tooling step, not required on all three machines:

```powershell
# Release owner only, later; this downloads/runs the Vercel CLI
npx.cmd vercel@latest login
npx.cmd vercel@latest link
npx.cmd vercel@latest deploy
# After preview checks and verified production environment configuration:
npx.cmd vercel@latest deploy --prod
```

Use the intended existing project when linking; do not create multiple projects accidentally. The generated `.vercel` directory must remain ignored. CLI deployment still has plan and project permissions; confirm eligibility rather than assuming it bypasses access rules. [Vercel CLI deploy](https://vercel.com/docs/cli/deploy). If hosted deployment remains unavailable, a local production run can support a clearly labeled contingency demo, but does not pass the required hosted-deployment gate.

### Verify production behavior, not just build status

Open the stable domain in a fresh private browser. Test login, reload, signout and denied protected navigation. Submit a synthetic report with photo and manual location; review it as staff, update status, and confirm citizen tracking after reload. Repeat a service request. Check restricted census/matching, public listings, map tiles, file access, mobile layout and a second citizen's denied access. Look at Vercel runtime logs and browser Network/Console while doing this.

“Ready” in Vercel means the deployment built; it does not prove the app can authenticate or read/write data. A runtime 500 often comes from a missing environment variable, wrong project scope, legacy Prisma/Better Auth imports, or an unhandled server error. A successful homepage with broken login can indicate redirect/cookie configuration. [Deployment troubleshooting](07-troubleshooting.md#vercel-and-runtime-failures).

- [ ] Correct project/repository/root/branch and Node 24 runtime selected.
- [ ] Required environment variables scoped and deployment rebuilt.
- [ ] Stable HTTPS origin and Supabase redirect settings agree.
- [ ] Runtime persistence, Auth, ownership, files and mobile workflows pass on the hosted app.

## 14. Final environment verification

Use two gates so missing feature code is not mistaken for a failed software installation. Record actual outcomes, date, tester and any assigned blocker in the team issue/PR. Do not check a box based only on reading the instructions.

### Gate A — before parallel feature development begins

These must work by the end of Day 1. A specific failing item needs an owner and a resolved implementation/configuration change before dependent features proceed. During onboarding, run sections 1–3 now, restore the existing app in section 4, and configure the cloud foundation in 6–7. Run feature-specific upload/map tests only after their implementation exists; run the release checks again after integration. Skip every explicitly conditional starter/initialization command in this existing checkout.

| Check | Procedure | Required result |
| --- | --- | --- |
| Node/npm | `node --version`; `npm.cmd --version` | Node 24 LTS and bundled npm resolve in PowerShell. |
| Git/GitHub | `git --version`; `git ls-remote origin`; push owned setup branch | Correct remote accessible, own commit identity, PR path available. |
| Correct checkout | `Get-Location`; `Test-Path .\package.json`; `git status` | Intended root; no accidental nested app; unrelated work preserved. |
| Dependencies | `npm.cmd ci`; `npm.cmd ls --depth=0` | Lockfile restores; no unresolved required peers. |
| Shared UI | Start dev server, inspect existing components | Tailwind and Base UI render with existing brand. |
| Legacy migration | Execute the checkpoint near the start of this guide | One Supabase Auth authority; no required runtime MySQL/Better Auth imports. |
| Supabase access | Dashboard read plus authenticated own profile read through app | Active project; correct URL/key; real client connectivity. |
| Auth/roles | Citizen login/refresh/signout; staff login; citizen staff-role tamper attempt | Sessions work; trusted role used; forbidden access denied. |
| Database security | Citizen A/B profile visibility and protected role-policy checks | Base grants/RLS match contract; no cross-user private profile data or role escalation. Repeat owned-record tests with feature slices in Gate B. |
| Environment protection | `git check-ignore .env.local`; inspect tracked/staged env files | Local config ignored; no secrets staged. |
| Static/production compilation | Run commands below after shared migration | All exit 0; no unknown legacy backend requirement. |
| Deployment readiness | Confirm Vercel import/CLI eligibility, Node and env plan | Release owner can create the intended hosted project. |

```powershell
# Later, after dependencies and shared migration are ready
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

### Gate B — before integration testing and demonstration

These depend on feature implementation. Configure their bucket/map foundations on Day 1 where possible; verify the real workflows as their vertical slices land.

- [ ] Civic report fields, unique full tracking ID, persistence, photo upload lifecycle and GPS/manual location work.
- [ ] Private photo read works for owner/staff; direct cross-user upload/read is denied.
- [ ] Service request/ref/status workflow works; attachment tests are N/A if deferred.
- [ ] Staff updates persist and are visible on citizen reload without requiring Realtime.
- [ ] Worker records are staff/admin-only; sample import/aggregates and deterministic matching satisfy the documented fixtures.
- [ ] Hotline entries are independently verified or visibly non-callable; project/office data is labeled synthetic where appropriate.
- [ ] Production build runs locally using `npm.cmd run start` after `build`; local Auth origin still matches the port.
- [ ] Hosted HTTPS app passes Auth, RLS, Storage, map and persistence tests in fresh sessions.
- [ ] Optional integrations are tested if included, otherwise explicitly marked N/A.
- [ ] Final [testing checklist](05-testing-phase.md) passes and the [Day 7 demo plan](06-seven-day-schedule.md) uses only known-good synthetic fixtures.

The environment is ready for parallel development only after Gate A passes. The MVP is ready for demonstration only after Gate B and the testing guide's acceptance gates pass. This handoff records instructions, not results of those future checks.
