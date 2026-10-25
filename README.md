# eLingkod Bayan – Los Baños

An integrated LGU management and citizen-services **academic/hackathon prototype** for Citizens, authorized Staff and Admins. It explores how digitization can reduce repeated visits and encoding, connect fragmented paper records, improve progress visibility and coordination, and support accessible services and informed local planning. It does not claim municipal endorsement or live government integration.

## Six core modules

| Module | Current capabilities |
| --- | --- |
| **1. Civic Reporting** | Reports with photos/location, tracking, staff handling, resolution review and citizen feedback. |
| **2. Online LGU Services** | Configurable requests, uploaded documents, status history, appointments, pickup and release verification. |
| **3. Emergency Hotlines & Alerts** | Public hotline/advisory views and protected maintenance, review and publishing. |
| **4. Municipal Projects & Services** | Directory descriptions and a module preview; full persisted project management is not implemented. |
| **5. Citizen Profiling** | Separate individual and establishment surveys, incomplete drafts, submissions, immutable history, ownership and optional consent. |
| **6. Worker Census & Social Profiling** | Protected records, imports, scoped analytics/exports, assistance rosters, opportunities, consent-based suggestions and readiness guidance. **Public census analytics is deferred.** |

Citizens manage their own records. Staff require explicit module grants and applicable office/barangay scopes; protected pages are not all Admin-only. Admins manage access and authorized reviews. Establishment representatives use Citizen accounts, not a separate Employer role. Matching provides up to five explained suggestions with current optional consent; it neither sends applications/profiles nor guarantees employment. Drafts and revisions are not additional respondents; establishment workforce and imported observations remain separate populations.

## Quick navigation

- [Local setup](#local-setup) · [Shared sample data](#shared-sample-data)
- [Local maintenance, backups and troubleshooting](docs/LOCAL-DEVELOPMENT.md)
- [Add data to an existing database](demo/HACKATHON-IMPORT.md)
- [Optional isolated demo](demo/README.md)
- [Architecture](#architecture-and-stack) · [Commands](#common-commands)

## Prerequisites

| Install | Purpose / version |
| --- | --- |
| [Git for Windows](https://git-scm.com/install/windows) | Clone and update this repository. |
| [Node.js 24 LTS](https://nodejs.org/en/download) | Runs the application and includes npm. |
| [MySQL Community Server 8.4 LTS](https://dev.mysql.com/downloads/mysql/8.4.html) | Stores accounts and records. Install the **server**, not just Workbench; keep its Windows service running. |
| Windows PowerShell 5.1 or [PowerShell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows) | Runs the commands below. A browser and text editor are also needed. |

Development compatibility baseline: Node 24.21.0, npm 12.2.1 and MySQL 8.4.13. Use the lockfile for application dependencies. Examples use `npm.cmd` to avoid the Windows `npm.ps1` execution-policy issue.

## Local setup

### 1. Install/start MySQL and check tools

Run the Windows MySQL installer and its Configurator. Choose a local **root password**, TCP port **3306** and a Windows service (normally `MySQL84`); start that service. These are credentials you create on your computer, unrelated to website logins. Add MySQL's `bin` folder to PATH if `mysql` is unavailable, then reopen PowerShell. More help: [installation and service checks](docs/LOCAL-DEVELOPMENT.md#mysql-installation-and-service).

In PowerShell, check installation:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    git --version; if ($LASTEXITCODE -ne 0) { throw 'Git is unavailable' }
    node --version; if ($LASTEXITCODE -ne 0) { throw 'Node is unavailable' }
    npm.cmd --version; if ($LASTEXITCODE -ne 0) { throw 'npm is unavailable' }
    mysql --version; if ($LASTEXITCODE -ne 0) { throw 'MySQL client is unavailable' }
}
```

### 2. Clone the repository

Run in a writable parent folder; the following uses `C:\Projects`:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    New-Item -ItemType Directory -Path 'C:\Projects' -Force | Out-Null
    Set-Location -LiteralPath 'C:\Projects'
    git clone https://github.com/francisjaneolvido/e-lingkod_system.git
    if ($LASTEXITCODE -ne 0) { throw 'Clone failed' }
    Set-Location -LiteralPath '.\e-lingkod_system'
}
```

All remaining commands run in this repository root, the folder containing `package.json`. In later terminals, first `Set-Location` to that folder.

### 3. Create a fresh database

Use the root password you chose during installation. If using a different local MySQL account, replace `root` here and use that account in step 4.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    mysql --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password --execute 'SELECT VERSION(); CREATE DATABASE e_lingkod_bayan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
    if ($LASTEXITCODE -ne 0) { throw 'Database creation failed; inspect the error before continuing' }
}
```

Expect a server version and successful creation. **If the database already exists, preserve it and use the [existing-database guide](docs/LOCAL-DEVELOPMENT.md#existing-database-updates).** Do not drop it or restore demo SQL over it.

### 4. Create your local configuration

This block prompts for your **local MySQL** credentials, URL-encodes the username/password, generates a cryptographically random authentication secret and writes an ignored `.env`. It refuses to overwrite an existing file. No `accounts.csv` or shared secret is needed to install the application.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    if (Test-Path -LiteralPath '.env') { throw 'Preserve the existing .env and inspect it instead' }
    $dbLogin = Get-Credential -UserName 'root' -Message 'Enter the local MySQL credentials you chose'
    if ($null -eq $dbLogin) { throw 'MySQL credentials were not supplied' }
    $dbUser = [Uri]::EscapeDataString($dbLogin.UserName)
    $dbPassword = [Uri]::EscapeDataString($dbLogin.GetNetworkCredential().Password)
    $secretBytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($secretBytes) } finally { $rng.Dispose() }
    $authSecret = [Convert]::ToBase64String($secretBytes)
    $lines = @(
        "DATABASE_URL=`"mysql://${dbUser}:${dbPassword}@127.0.0.1:3306/e_lingkod_bayan`""
        "BETTER_AUTH_SECRET=`"${authSecret}`""
        'BETTER_AUTH_URL="http://localhost:3000"'
    )
    [IO.File]::WriteAllLines((Join-Path (Get-Location).Path '.env'), $lines, (New-Object Text.UTF8Encoding $false))
    Write-Output 'Local .env created.'
}
```

`DATABASE_URL` has the form `mysql://ENCODED_USER:ENCODED_PASSWORD@HOST:PORT/DATABASE`. Encoding prevents password characters such as `@`, `:`, `/`, `#` and `%` from becoming URL syntax; do not encode an already encoded password again. `BETTER_AUTH_SECRET` protects authentication state. `BETTER_AUTH_URL` must match the browser's origin. Keep `.env` private and retain its secret across restarts. The file is developer-created; Git does not supply a root `.env.example`.

### 5. Install dependencies and migrate the fresh database

Create `.env` **before** `npm ci`: postinstall generates Prisma Client and reads the database configuration.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation or client generation failed' }
    npm.cmd run db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop and inspect it' }
    node node_modules/prisma/build/index.js migrate status
    if ($LASTEXITCODE -ne 0) { throw 'Database is not up to date' }
}
```

Expect dependency installation, Prisma generation, migration completion and an up-to-date status. Migrations create the schema, not the shared sample accounts.

### 6. Start the website

Keep this **Terminal A** open:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
    if ($LASTEXITCODE -ne 0) { throw 'Application server stopped with an error' }
}
```

Wait for **Ready**, then open **http://localhost:3000**. MySQL remains running separately. Stop the app with **Ctrl+C**; restart with the same command. Use Terminal B for other commands. Optional Prisma Studio is a database editor, not the website or MySQL server; see the [tools guide](docs/LOCAL-DEVELOPMENT.md#other-tools-and-checks).

Register a Citizen at `/register`, or use supplied account logins **after** importing shared data. Registration requires the profile fields and a 12–128-character password with upper/lowercase letters, a number and a symbol. There is no public Staff/Admin role selector; [local bootstrap instructions](docs/LOCAL-DEVELOPMENT.md#local-role-bootstrap) explain authorized setup.

## Shared sample data

The optional dataset has **108 functional synthetic accounts**: 80 individual Citizens, 20 establishment representatives, four Admins and four Staff, with survey histories, establishments, vacancies and related scenarios. These are fictional people and demonstrations, not real residents or recruitment. An existing installation's final user count depends on its own records and collisions.

**Yesel supplies only `accounts.csv`, containing website login credentials.** It is needed to use those supplied logins, not to install MySQL or the application. Database credentials, configuration and auth secrets are created locally using the steps above. The repository also contains the dedicated demo's [account catalogue](demo/accounts.csv); linked IDs there belong to that demo, not another imported database.

- **Existing or freshly migrated ordinary database:** follow the [additive import guide](demo/HACKATHON-IMPORT.md). It backs up/rehearses before importing, preserves existing accounts/passwords/records, reports collisions and retains recovery state. Do not restart an already completed import with a new state directory.
- **Separate disposable-style team demonstration:** use the [isolated demo guide](demo/README.md); its persistent dedicated database is separate from ordinary data. Full SQL restore is not a merge.

## Architecture and stack

A modular Next.js application serves browser UI and server endpoints. Better Auth manages credential hashing and database-backed sessions; server-side permissions and ownership checks protect mutations and reads. Prisma migrations maintain MySQL schema. Uploaded photos/documents are stored in the database behind authorized endpoints; notifications are in-app. Public census analytics remains unavailable, and no external messaging provider is required for local setup.

```mermaid
flowchart LR
    Browser[Browser] --> App[Next.js UI and server endpoints]
    App --> Auth[Better Auth and permissions]
    App --> Features[Feature services]
    Auth --> DB[(MySQL)]
    Features --> Prisma[Prisma Client]
    Prisma --> DB
```

Locked dependencies include Next.js **16.4.2**, React **19.3.0**, Prisma **7.10.1**, Better Auth **1.7.11**, TypeScript **5.9.3** and Tailwind CSS **4.3.3**. Supabase is not the current runtime. `src/app` contains routes; `src/features` contains module UI/services; `src/lib` contains shared auth/database helpers; `prisma` holds schema/migrations; `tests` and `scripts` hold maintained checks/tools; `demo` holds synthetic fixtures and guides.

Useful routes: `/login`, `/register`, `/reports`, `/services`, `/emergency`, `/community-survey`, `/establishment-survey`, `/opportunities`, `/admin/census`, `/admin/census/analytics` and `/admin/jobs`. Access depends on the account's permissions.

## Common commands

Run from the repository root; wait for each command to succeed before continuing.

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Development server; use step 6 for explicit host/port. |
| `npm.cmd run build` / `npm.cmd run start` | Production build, then production server. Stop a conflicting dev server first. |
| `npm.cmd run db:generate` | Regenerate Prisma Client after schema/dependency updates; restart the app afterward. |
| `npm.cmd run db:migrate` | Deploy reviewed migrations; existing data needs the backup/rehearsal procedure first. |
| `npm.cmd run typecheck` / `npm.cmd run lint` | Static checks. |
| `npm.cmd run test:all` | Repository tests; guarded database suites may skip without their isolated runners. |
| `npm.cmd run test:profiling` / `test:establishments` / `test:census` / `test:analytics` / `test:opportunities` | Individual isolated regression runners; invoke each as `npm.cmd run SCRIPT_NAME`. |

For connection errors, missing columns, ports, environment overrides, PowerShell and importer recovery, see [local maintenance and troubleshooting](docs/LOCAL-DEVELOPMENT.md). Optional demo/export commands are documented in the [demo guide](demo/README.md).
