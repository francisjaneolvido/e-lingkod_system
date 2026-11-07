# Local maintenance and troubleshooting

Start with the [README](../README.md) and [Windows setup](WINDOWS-SETUP.md). These procedures preserve established data; they are not a second installation path.

## Configuration and environment precedence

Keep `.env`, `.env.local`, `.env.demo.local`, `.env.import.local` and maintenance configurations private. Track only placeholder templates. Never overwrite an existing configuration or generate a replacement `BETTER_AUTH_SECRET` as routine troubleshooting. The secret, database credentials and website account credentials have different purposes.

Next.js reads its normal environment-file precedence, while Prisma CLI uses `prisma.config.ts` and root `.env`. The demo runner reads `.env.demo.local`; the additive importer requires its explicit config. Existing process variables can override dotenv values. `Test-Path Env:DATABASE_URL` checks for an override without printing it. Correct conflicting configuration deliberately, then restart the affected process. Do not paste environment dumps into reports.

Use URL-encoded database username/password components exactly once. Use the raw password at the MySQL client prompt. For MySQL 8.4 first-connection RSA errors, configure the public PEM belonging to that server in `MYSQL_RSA_PUBLIC_KEY_PATH`; do not change authentication plugins or rely on a warmed login cache. Direct fixture/import tools and the application both use this setting.

## MySQL installation and service

MySQL Server stores data; `mysql`, Workbench and Prisma Studio are clients. A Next.js server cannot replace MySQL. Install/start the actual server using [Windows instructions](WINDOWS-SETUP.md). A Windows service usually needs authorized elevation to start/stop. A portable server uses its existing user-owned data directory in a separate terminal; never initialize it again to restart it.

Check the intended host/port and connect with your own local credentials. Use `SELECT VERSION(), @@port, @@datadir;` to identify a server rather than assuming a listener belongs to a particular database. Do not stop unidentified database/application processes.

## Existing database updates

Preserve configuration/local work, stop known writers, install locked dependencies and generate the client. Read `migrate status`. If all migrations are applied, do not repeat activation or imports. Start the existing application with the same origin.

### Pending migrations, backup and rehearsal

Use [migration review and additive imports](../demo/IMPORT.md). The separate maintained `scripts/rehearse-local-migrations.mjs` pins all current release migrations, creates a private backup, restores an owned disposable clone, compares rows/fields and rehearses migration there. It never deploys to the source. Unknown, changed or unfinished migration history stops the operation.

After the installation owner reviews the exact SQL and preservation proof, `npm.cmd run db:migrate` applies it to the deliberately configured source. A failure requires investigation with the app stopped; never automatically restore over it, retry DDL, run reset/db push or fabricate migration history. Keep private backups/proofs. The additive importer's original seven-migration allowlist is unchanged; it is not the general upgrade mechanism.

For already-current databases, the optional importer takes its own pre-import backup/restoration proof and preserves existing accounts/passwords/records. A full SQL export/restore is not an additive import. Reuse the same journal after an interruption and do not rerun imports as a daily startup step.

## Local role bootstrap

The primary synthetic setup supplies four Admins and four Staff through known fixture identities. It does not alter public signup. To bootstrap an independently created local installation without demo accounts, register your own account normally, then the authorized local owner can use `npm.cmd run civic:admin -- your.registered.address@example.test`. This is an explicit privileged database operation, not a public registration option. Admins manage Staff/module/scope access through the application. Do not use the command to take over someone else's account.

## Tools and verification

See [developer commands](DEVELOPMENT.md). Prisma Studio is optional and edits the database directly, outside application authorization. Development and production build/start are different; neither should be confused with deploying migrations. Regenerate client output after obtaining a schema/tooling change, then restart the application process. Do not manually merge generated internals or hide Git changes with index flags.

## Troubleshooting

| Symptom | Check / recovery |
|---|---|
| `git`, `node`, `npm.cmd`, `mysql` not found | Install the named tool, correct user/session PATH and reopen the terminal. Workbench alone is not MySQL Server. |
| Connection refused | Start the intended MySQL service/portable server; check host/port and its actual data directory. |
| Access denied / RSA key retrieval | Use your local database password and correct grants/URL encoding; configure this server's public PEM. Website credentials do not authenticate MySQL. |
| Wrong database/session behavior | Check environment-file/process overrides and browser origin. Keep separate browser profiles for distinct localhost installations because cookies are not port-isolated. |
| Website credential rejected | Load the matching dataset first. Yesel's catalogue is private and must match the synthetic metadata. A collided existing account retains its original password. |
| Missing table/column or Prisma field | Compare code, generated client and migration history. Follow rehearsal/update steps; do not reset/reimport to mask schema drift. |
| Setup/import stops after interruption | Preserve the same private journal. Ambiguous commits or manual edits fail closed; do not remove checkpoints to bypass them. |
| Port occupied | Stop only your known application or deliberately choose another supported origin/port consistently in configuration. Do not point a test launcher at ordinary data. |
| `npm.ps1` or local script blocked | Use `npm.cmd`; use the documented manual config alternative if policy blocks local scripts. Do not change global execution policy. |
| `npm ci` network/proxy failure | Correct your network configuration and retry after the failed process exits. Do not disable TLS. Keep locked versions. |
| Package install-script warning | Review the named package and actual generation/build result. Do not blanket-enable untrusted lifecycle scripts or upgrade dependencies merely to hide a warning. |
| Generic recovery confirmation but no email | Configure the server-only provider/sender. Confirmation prevents account disclosure and is not proof of delivery. |
| Invitation delivery disabled | Configure provider/from, or deliberately use the documented development-only local activation option. Never call that email delivery. |

Record exact commands, exit codes and redacted diagnostics. Generated screenshots/reports, credentials, mail captures, IDs and database contents do not belong in a PR.
