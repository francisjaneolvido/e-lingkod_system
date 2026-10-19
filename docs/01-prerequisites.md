# 01 — Prerequisites

[README](../README.md) · Next: [Installation and environment setup](02-installation-and-environment-setup.md)

Install machine-level tools once per computer. Install project packages inside this repository later, using the setup guide. **Reviewed on 20 October 2026:** the source, lockfile, official guides, and read-only npm registry metadata were inspected. No dependency installation or application runtime verification was performed for this handoff.

## A. Local software

| Item and purpose | Status and installation/configuration | Compatibility | Verification and official reference |
| --- | --- | --- | --- |
| Node.js — runs Next.js and tooling | Required; Windows installer for the latest **24.x LTS** patch. Keep npm and Add to PATH selected. | Use Node 24 locally and on Vercel. It satisfies both Next.js and the current Supabase client. Avoid Current/nightly for this week. | `node --version` reports `v24.x.x`; `Get-Command node` resolves the intended installation. [Download](https://nodejs.org/en/download), [release schedule](https://nodejs.org/en/about/previous-releases). |
| npm — package installation and scripts | Required; bundled with Node. No separate npm installation/global upgrade. Use `npm.cmd` in PowerShell to avoid the PowerShell shim. | Keep the version bundled with the team's Node installer unless a documented issue requires a coordinated change. | `npm.cmd --version`; later `npm.cmd ci` succeeds. [Installation guidance](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci). |
| Git — history, branches, merges | Required; independently install Git for Windows with PATH access and Git Credential Manager. | Use a maintained release and one line-ending convention. Git and GitHub are separate tools. | `git --version`, `git config --get user.name`; later `git ls-remote origin`. [Installer](https://git-scm.com/install/windows). |
| Existing editor/IDE — editing and navigation | Required; use the installed Visual Studio, VS Code, or other editor. Open the folder containing `package.json`. No IDE installation is needed. | Must support TypeScript/TSX and UTF-8 Markdown, with PowerShell available externally or in a terminal. | Open `src/app/page.tsx`; check `Get-Location` and `Test-Path .\package.json`. [VS Code folder/workspace reference](https://code.visualstudio.com/docs/editing/workspaces/workspaces). |
| Existing browser — forms, requests, permissions | Required; maintained Edge/Chrome and an actual mobile browser for final checks when available. | Location and push require secure contexts. HTTP on a LAN IP is not equivalent to localhost. | Open Developer Tools Console/Network. [Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts). |

Allow roughly 2 GB of free space initially, plus space for `node_modules` and `.next`; actual usage varies. Internet is required for packages, Supabase, tiles and deployment. Keep OneDrive files locally available, and avoid running multiple installs/builds against the same checkout.

## B. Accounts and cloud services

| Item and purpose | Status and configuration | Compatibility/limits | Verification and official reference |
| --- | --- | --- | --- |
| GitHub — repository and reviews | Required for each developer. Accept the owner's collaborator invitation; use HTTPS with Git Credential Manager. | A private class repository is suitable. Do not share accounts or put tokens in remote URLs. | Open repository signed in; `git ls-remote origin`; later push an owned branch. [Account creation](https://docs.github.com/en/get-started/start-your-journey/creating-an-account-on-github), [credentials](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git). |
| Supabase — PostgreSQL, Auth, files | Required. Owner creates a dedicated synthetic-data project; invite teammates with the least available dashboard permissions needed. | Choose a reachable region and default supported PostgreSQL version. Dashboard organization access is different from application staff roles. | Open project SQL Editor and Auth/Storage settings; later verify client allow/deny behavior. [Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs). |
| Vercel — hosted demonstration | Required for final hosting. Release owner imports GitHub repository. Paid seats are not needed for the local development workflow. | Check Hobby eligibility and private organization repository/collaboration limits early. Use Node 24.x. | Build logs accessible; later HTTPS deployment passes fresh-browser smoke tests. [Next.js hosting](https://vercel.com/docs/frameworks/full-stack/nextjs), [Hobby plan](https://vercel.com/docs/plans/hobby). |

### Free-tier planning

At review, Supabase Free listed **500 MB database space, 1 GB file storage, 5 GB egress**, a two-active-project limit, and pausing after a week of inactivity. Recheck [current pricing](https://supabase.com/pricing) before creation. Keep demo images small, clean abandoned test files, and wake/check the project before presentation. Keep synthetic fixtures and migrations reproducible; backup/recovery facilities differ by plan.

Vercel Hobby is for personal, non-commercial use and has usage/collaboration limits. Verify private repository import eligibility on Day 1. If blocked, use the [owner-controlled deployment fallback](02-installation-and-environment-setup.md#13-vercel), rather than making private code public to bypass a plan restriction. Custom domains and paid collaboration features are unnecessary for the MVP.

Supabase's default Auth email sender restricts recipients and sending rates. Pre-create synthetic demo accounts rather than relying on public signup mail. A custom sender may require provider configuration and payment; application status email remains optional.

## C. Frontend and backend dependencies

The starter already supplies most UI/build packages. `npm.cmd ci` installs the committed lockfile; do not reinstall the framework independently.

| Item and purpose | Status and method | Compatibility | Verification and official reference |
| --- | --- | --- | --- |
| Next.js — routing, rendering, server operations | Required; already declared/locked at **16.4.2**. Use `src/app`. | Node >=20.9 in Next metadata, but use 24 for the complete stack. Keep `eslint-config-next` aligned. | `npm.cmd ls next eslint-config-next`; build. [App Router installation](https://nextjs.org/docs/app/getting-started/installation). |
| React + React DOM — components/rendering | Required; both currently 19.3.0. Reviewed stable registry tag is **19.3.1**; one maintainer should evaluate and align both patch versions in the shared setup PR. | Next 16.4.2 accepts React 19; DOM needs a compatible React version. No default use of `--force`/`--legacy-peer-deps`. | `npm.cmd ls react react-dom`. [React versions](https://react.dev/versions), [React metadata](https://registry.npmjs.org/react/latest), [Next metadata](https://registry.npmjs.org/next/16.4.2). |
| TypeScript — static checking | Required; already a dev dependency with `tsconfig.json`. | Next 16 documents TS >=5.1. Keep the committed 5.x version and compatible declaration majors. | `npm.cmd run typecheck`. [TypeScript configuration](https://nextjs.org/docs/app/api-reference/config/typescript). |
| Tailwind CSS — utility classes/theme | Required; already 4.3.3 with `@tailwindcss/turbopack`, CSS imports and variables. | Current checkout uses a Turbopack CSS rule. Do not add a duplicate PostCSS pipeline or Tailwind 3 configuration. | Existing spacing/colors render; build compiles CSS. [Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs). |
| shadcn/ui — editable UI components | Required; already `components.json` and button/input/card/label/badge/separator. Reuse; initialize only if configuration is absent. | Existing `base-nova` preset uses Base UI. Avoid switching presets or copying Radix-specific component props. | Inspect config, use an existing button, verify focus/keyboard behavior. [Installation](https://ui.shadcn.com/docs/installation/next), [configuration](https://ui.shadcn.com/docs/components-json). |
| `@supabase/supabase-js` — database/Auth/files | Required target package; absent now. Add once during shared setup. | Reviewed **2.118.0** requires **Node >=22**. Team standard 24 LTS satisfies it. | `npm.cmd ls @supabase/supabase-js`; allowed/denied requests. [SDK](https://supabase.com/docs/reference/javascript/introduction), [metadata](https://registry.npmjs.org/@supabase/supabase-js/latest). |
| `@supabase/ssr` — cookie-aware clients | Required target package; absent now. Install with SDK and adapt official helpers during implementation. | Reviewed **0.12.7** requires SDK `^2.114.0`, satisfied by 2.118.0. Next 16 uses `proxy.ts` and asynchronous `cookies()`. Avoid deprecated Auth Helpers. | `npm.cmd ls @supabase/ssr`; protected-page refresh and signout. [SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs), [metadata](https://registry.npmjs.org/@supabase/ssr/latest). |
| Leaflet — maps | Required for reporting; add **1.9.4** later. Import CSS and render in browser. | Works with React Leaflet 5; selected standard OSM tiles do not need an API key, but usage policy applies. | Tiles/marker render and selected coordinates persist. [Quickstart](https://leafletjs.com/examples/quick-start/). |
| React Leaflet — map components/hooks | Required; add **5.0.0** later, without reinstalling React. | Stable metadata requires React/DOM `^19.0.0`, Leaflet `^1.9.0`. Avoid older docs' prerelease `@next`/`react@rc` commands. | `npm.cmd ls react-leaflet leaflet react react-dom`; map page refresh. [Installation](https://react-leaflet.js.org/docs/start-installation/), [metadata](https://registry.npmjs.org/react-leaflet/5.0.0). |
| Type declarations — library types | Required; React, DOM, Node types already exist. Add **only `@types/leaflet`** for maps; React Leaflet bundles its types. | React declarations stay on major 19. Existing Node types are major 20; Node 24-only APIs need a deliberate type update. | `npm.cmd ls @types/node @types/react @types/react-dom @types/leaflet`; typecheck. [Map typing](https://react-leaflet.js.org/docs/start-installation/). |
| Existing helpers/icons — UI dependencies | Required where imported; Base UI, Lucide, class-variance-authority, `cn` and animation CSS already declared. | Preserve existing imports/components; inspect before adding competing helpers. | `npm.cmd ls --depth=0`; existing UI compiles. [Base UI](https://base-ui.com/react/overview/quick-start). |

No separate Express service, ORM, database driver, geocoder, form framework, or spreadsheet parser is required by the target plan. Use server validation plus PostgreSQL constraints. Import synthetic SPES-style **JSON**, not arbitrary Excel files. Existing Prisma/Better Auth packages are migration starting points, not approved backend requirements.

### Recheck compatibility without changing packages

These are **later developer commands**, after Node setup. `npm view` reads metadata; it does not install the package. The committed lockfile defines repeatable installation. Only the nominated maintainer changes dependencies.

```powershell
npm.cmd view next@16.4.2 engines peerDependencies
npm.cmd view react-leaflet@5.0.0 peerDependencies
npm.cmd view @supabase/supabase-js@2.118.0 engines peerDependencies peerDependenciesMeta
npm.cmd view @supabase/ssr@0.12.7 peerDependencies
```

## D. Optional services

| Item and purpose | Status and configuration | Compatibility/prerequisites | Verification and official reference |
| --- | --- | --- | --- |
| Supabase Realtime — live status refresh | P2. Existing SDK supports it. Publish only chosen report/request tables. | Working Auth, SELECT grants and RLS; never publish census records. Manual refresh remains the fallback. | Staff updates in another session; owner receives change, other citizens do not; reload recovers after disconnect. [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). |
| Web Push — browser notifications | P2. Later add `web-push`, VAPID keys, a service worker, and protected subscriptions. | HTTPS/localhost, explicit permission and browser support. iOS/iPadOS requires a supported installed Home Screen app. Private VAPID key stays server-side. | Opt in, receive test, unsubscribe; denied permission does not block tracking. [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps). |
| Email — optional status mail; Auth SMTP when needed | P2 for notifications. Custom Auth SMTP may be needed earlier if confirmation mail remains enabled. Configure provider, verified sender and server-only credentials. | Auth SMTP sends Auth mail, not report updates. Status mail needs separate server integration and provider limits review. | Owned test mailbox receives message; failure does not undo committed report. [Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [example provider](https://resend.com/docs/send-with-nodejs). |
| Supabase Cron — periodic deadline flags | P2. Enable Cron/`pg_cron` in Dashboard after deadline rules exist. Use a short SQL job. | UTC timestamps, demo-only deadlines, idempotent changes and bounded runtime. No local scheduler/CLI is needed. | Job run succeeds and flags one overdue synthetic record; repeat creates no duplicate escalation. [Cron](https://supabase.com/docs/guides/cron), [quickstart](https://supabase.com/docs/guides/cron/quickstart). |

Mark unimplemented optional features **Not implemented / N/A** in test records. They are not failed core requirements.

## Final prerequisites checklist

- [ ] Node 24 LTS and bundled npm resolve in a new PowerShell terminal.
- [ ] Git resolves; commit identity and GitHub authentication are configured.
- [ ] All teammates can access the repository and understand feature branches/PRs.
- [ ] Existing MySQL/Auth source and the planned Supabase migration are understood.
- [ ] Supabase owner, migration coordinator, and Vercel release owner are named.
- [ ] Current cloud limits and repository deployment eligibility are checked.
- [ ] Existing UI/framework dependencies will be reused; missing target packages added once.
- [ ] Team agrees on Node major, lockfile owner and database contracts.
- [ ] Only synthetic/anonymized fixtures will be used; hotline numbers need verification.
- [ ] Optional integrations are deferred until core acceptance passes.

Continue to [installation and environment setup](02-installation-and-environment-setup.md). Account access alone does not establish working authentication or safe database permissions.
