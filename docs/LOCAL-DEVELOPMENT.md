# Local maintenance and troubleshooting

Start with the [root setup guide](../README.md). Commands here run from the repository root in Windows PowerShell 5.1 or PowerShell 7. Run each block separately and inspect its result before proceeding. Configuration files and backups described as local are created by you; they are not downloaded from another developer.

## MySQL installation and service

1. Download the Windows MySQL Community Server **8.4 LTS** MSI from [MySQL](https://dev.mysql.com/downloads/mysql/8.4.html). Install the server and run MySQL Configurator. Workbench alone does not install a running server; XAMPP/MariaDB is not the documented server here.
2. Enable TCP/IP on port 3306, choose a root password and configure a Windows service, normally `MySQL84`. Record the password privately. The website's Citizen/Staff/Admin passwords do not authenticate MySQL.
3. Start the service in Windows Services (`services.msc`). If using PowerShell, first inspect the actual installed service name with `Get-Service -Name '*MySQL*'`; from an elevated shell, `Start-Service -Name 'MySQL84'` starts that service if that is its name. Do not start or stop unrelated services.
4. Add the installation's `bin` folder, commonly `C:\Program Files\MySQL\MySQL Server 8.4\bin`, to your user PATH. Reopen PowerShell and run `mysql --version`. `mysqldump` is another executable in this folder; it creates backups and is not the application server.
5. Check connectivity using `mysql --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password --execute 'SELECT VERSION(), DATABASE();'`. It prompts for your local root password. A version and a null database are expected before choosing a schema. Stop on a failed exit code.

The root README's generated `.env` uses your local account for a development installation. A database-scoped MySQL account is also possible: its schema must exist and its grants must permit the application's operations and reviewed migrations. The importer's recovery rehearsal additionally needs **CREATE/DROP DATABASE** privileges for its temporary clone. Use an explicitly configured local administrative connection for that operation; do not disable its target guards. Do not expose MySQL or a development server to the internet.

## Files and configuration

| Resource | Supplied by Git? | Action |
| --- | --- | --- |
| `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations/` | Yes | Install the lockfile and use the matching migrations/client. |
| Root `.env` | No | Create using the root README's prompt/secret-generation block. Preserve an existing file. |
| Root `.env.example` | No | Not needed: do not try to copy it. |
| `demo/hackathon.env.example`, `demo/demo.env.example` | Yes | Copy only for the optional operation being configured; replace placeholders with your local values. |
| `.env.hackathon.local`, `.env.demo.local` | No | Local, ignored connection settings; never commit them. |
| `demo/accounts.csv`, fixtures, SQL and export manifest | Yes | Synthetic dedicated-demo resources. Ordinary imported IDs are reported separately. |
| Your backup/recovery directory | No | Created locally by the importer or backup tool; retain privately. |

Required application variables:

```dotenv
DATABASE_URL="mysql://ENCODED_USER:ENCODED_PASSWORD@127.0.0.1:3306/e_lingkod_bayan"
BETTER_AUTH_SECRET="YOUR_LOCALLY_GENERATED_RANDOM_SECRET"
BETTER_AUTH_URL="http://localhost:3000"
```

Use the root setup block to generate real values. It uses .NET's cryptographic random generator and encodes the *raw* MySQL username/password with `[Uri]::EscapeDataString`. For example, a fictional password `Example@pass#1` becomes `Example%40pass%231` in the URL; enter the raw password at a MySQL password prompt. Do not reuse that example password. Changing `BETTER_AUTH_SECRET` unnecessarily can invalidate authentication state.

Next.js may prefer `.env.local` or mode-specific files, and existing process environment variables can override file values. Prisma CLI uses `prisma.config.ts` with `dotenv/config`; the importer and demo runner read their explicit files. Avoid conflicting targets across these mechanisms. To inspect whether a shell override exists **without printing its secret**, run `Test-Path Env:DATABASE_URL`. After intentionally correcting configuration, close/reopen the terminal and restart the app. Never paste an environment dump into an issue.

Normal local use requires no mail provider. Staff invitations can send real email if `RESEND_API_KEY` and `STAFF_INVITE_FROM` are configured; leave them unset for this setup. Do not configure external messaging just to exercise local data.

## Existing database updates

### No pending schema change

Preserve `.env`, local work and existing records. Stop the application with Ctrl+C before replacing its dependencies/client. After obtaining the reviewed code through your Git workflow:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
    node node_modules/prisma/build/index.js migrate status
    if ($LASTEXITCODE -ne 0) { throw 'Inspect pending or failed migrations; do not continue as an ordinary restart' }
    npm.cmd run db:generate
    if ($LASTEXITCODE -ne 0) { throw 'Client generation failed' }
}
```

An up-to-date result means no migration is needed. Restart using the root README's explicit host/port command. If an additive import already completed, **do not rerun it with a new state directory**, reset it or restore demo SQL to obtain an expected account total.

### Pending migrations, backup and rehearsal

Stop application servers, Studio and other database writers first. Migration status can return nonzero for pending migrations; read its output rather than treating it as a clean result. Failed or unfinished migrations require investigation, not `migrate reset` or fabricated migration history.

The repository-distributed [additive importer preparation](../demo/HACKATHON-IMPORT.md#2-prepare-the-backup-and-migration-rehearsal) provides a full private backup, exact disposable restoration and preservation checks for its **seven pinned prerequisite migrations**. Preparation reads ordinary data; it rehearses migrations only on its newly created clone. The subsequent import needs an explicit `--migrate-reviewed` to apply those approved prerequisites. If you need the shared dataset and every pending migration is covered, use that complete procedure.

**Tooling limit:** this is not a general deployment-rehearsal tool. `20261024130000_opportunity_details` and any other migration outside `scripts/hackathon/prerequisites.mjs` are not authorized by that importer. An older database with such pending migrations cannot use the combined prepare/migrate/import path. Stop at its `Unreviewed prerequisite migration` error. Do not edit the allowlist, use a private review script, or run migrations on the ordinary target to make preparation appear successful. A separately reviewed, distributed rehearsal for the pending change is required. Already-current databases and fresh installations using the root setup are supported; an arbitrary older database is not promised an automatic upgrade by this guide.

For an additional native backup, the following writes directly to a private file, avoiding PowerShell 5.1 SQL-redirection encoding problems. Use your own local MySQL account and stop all writers first:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $backupDirectory = Join-Path $env:LOCALAPPDATA ('eLingkodBayan\backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $backupDirectory -ErrorAction Stop | Out-Null
    $backupFile = Join-Path $backupDirectory 'e_lingkod_bayan.sql'
    mysqldump --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password --single-transaction --hex-blob --no-tablespaces --set-gtid-purged=OFF --result-file="$backupFile" e_lingkod_bayan
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed; preserve diagnostics and do not migrate' }
    if ((Get-Item -LiteralPath $backupFile).Length -eq 0) { throw 'Backup is empty' }
    Get-FileHash -LiteralPath $backupFile -Algorithm SHA256
}
```

A nonempty dump/checksum proves file creation, **not** successful restoration or preservation. Keep it local and verify restoration into a fresh disposable clone before any reviewed ordinary migration. The supported importer performs that verification itself. Its `pre-import.sql` has its own statement format and must be restored by the matching preparation code, not substituted for the native dump above. Never test restoration on the ordinary target. After any separately approved schema deployment, generate the matching Prisma Client, restart the app and verify preserved accounts/fields plus authenticated workflows.

## Local role bootstrap

Register a Citizen through `/register` first. For your own authorized local installation, promote that existing account using the maintained tool; replace the sample address with the registered address:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    npm.cmd run civic:admin -- your.registered.address@example.test
    if ($LASTEXITCODE -ne 0) { throw 'Local Admin promotion failed' }
}
```

This changes database privileges; it is not public registration. Admins maintain Staff in `/admin/staff`. CENSUS module permission and barangay record scope are separate from the assistance roster. JOBS permission covers creator-owned listing maintenance; Admin alone approves publication. Roster assignment grants no census permission.

## Other tools and checks

- **Optional Prisma Studio:** from another repository-root terminal, `node node_modules/prisma/build/index.js studio --port 5555 --browser none`. Open the address it prints and stop with Ctrl+C. It edits data directly, outside application permission checks.
- **Production locally:** stop any app occupying port 3000, run `npm.cmd run build`, check exit code, then `npm.cmd run start`. A successful HTTP response does not replace migration or role checks.
- **Tests:** `npm.cmd run test:all` includes guarded suites that can skip. `test:profiling`/`test:establishments` derive a disposable target from local `.env`; census/analytics/opportunity runners require the explicit demo configuration described in the [demo guide](../demo/README.md). Their MySQL account needs temporary schema creation/cleanup privileges. Never point a write test at ordinary data.
- **Anonymous smoke:** after startup, open `/login`, `/community-employment` and `/opportunities`. `/api/opportunities` should return a `jobs` array, with no `createdById` or `reviewSource` per job. Also test Citizen ownership, scoped Staff denial/access and Admin maintenance; anonymous 200 responses alone do not establish role correctness.

## Troubleshooting

| Symptom | Check / recovery |
| --- | --- |
| `mysql`/`mysqldump` not found | Install the server tools, add their `bin` directory to PATH and reopen PowerShell. |
| Database unreachable / connection refused | Confirm the MySQL Windows service, host and port. MySQL and Next are different processes. |
| MySQL access denied | Use the local password chosen during installation. Check account host/grants and URL encoding. Website credentials from `accounts.csv` do not work here. |
| Website login fails | Register locally, or import the synthetic dataset before using its logins. A collided existing email retains its original password; do not test it with the fixture password. |
| Missing table/column | Compare code/client and `migrate status`. Use the existing-database procedure; do not reset or blindly reimport. |
| Prisma unknown field or old singleton | Generate the matching client, stop/restart the application process. Do not discard generated changes without inspection. |
| Port occupied | Stop only the known app with Ctrl+C or choose another port and update its auth origin consistently. MySQL uses 3306; ordinary app uses 3000; isolated demo uses 3102. |
| Login redirects/session/cookie errors | Use the configured `http://localhost:3000` consistently. A listener bound to `127.0.0.1` does not change the browser/auth hostname. Check overriding environment files. |
| `npm.ps1` blocked | Use `npm.cmd`, as in the examples. No global execution-policy change is required. |
| Native command failed but shell continued | Use grouped blocks and check `$LASTEXITCODE`; `$ErrorActionPreference` alone does not catch every native failure. Stop subsequent steps. |
| Import collision / manual edit / interrupted operation | Preserve the same recovery directory and records. Follow the [import recovery rules](../demo/HACKATHON-IMPORT.md#retries-collisions-and-interruptions); do not delete checkpoints or reset passwords. |
| Download/proxy failure during `npm ci` | Correct the local network configuration and retry. Do not disable TLS or weaken authentication. |

For the dump flags and recovery considerations, see the [official mysqldump documentation](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html).
