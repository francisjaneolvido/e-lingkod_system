# Windows installation

Use the [README](../README.md) as the primary sequence. Commands run in a normal PowerShell terminal unless explicitly labelled **Administrator** or **MySQL prompt**. Native command failure is not caught by `$ErrorActionPreference` alone: check `$LASTEXITCODE` and stop if it is nonzero. Examples work in Windows PowerShell 5.1 and PowerShell 7; they do not require changing execution policy.

## 1. Tools and installation choices

Use a supported 64-bit Windows installation and an x64 browser. Tested application-tool versions: Git 2.56.0.windows.3, Node 24.22.1, npm 11.19.1 (bundled) and 12.2.1, and MySQL 8.4.13. Use the Node 24 LTS line and MySQL 8.4 LTS line; application dependencies come from the lockfile, not separate global installations of Next.js or Prisma.

| Tool / purpose | Official source and choices | Administrator access | Verification |
|---|---|---|---|
| Git 2.x: obtain/update source | [Git for Windows](https://git-scm.com/install/windows). Choose Git on the command-line PATH; default editor/line-ending options are suitable. | System-wide setup may ask; official Portable Git can be extracted under your profile. | `git --version` prints Git 2.x. |
| Node 24 LTS and bundled npm: run/build the app | [Node downloads](https://nodejs.org/en/download). Windows x64 MSI: include npm and PATH. Extra native build tools are not required by this lockfile's normal prebuilt Windows packages. | MSI normally asks. The official Windows ZIP can run from a user-writable folder. | `node --version` prints `v24.x`; `npm.cmd --version` prints the bundled npm version. |
| MySQL Community Server 8.4: persistent data | [MySQL downloads](https://dev.mysql.com/downloads/mysql/8.4.html). Choose Windows x64 server MSI and Configurator, not only Workbench/Shell. Configure a development machine, TCP 3306 and a named Windows service. Keep default strong authentication; local-only use does not need an inbound firewall exception. | Installing/configuring a Windows service needs elevation. A ZIP server can run under your user without service registration if the required runtime is present. | `mysqld --version` and `mysql --version` print 8.4.x. A SQL connection is checked separately below. |
| Microsoft Visual C++ runtime: MySQL/native packages | Use the [Microsoft supported x64 Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist). The MySQL installer may check this prerequisite. | Installation can need elevation; ask IT if missing. Do not download individual DLLs from other sites. | MySQL/native Node executables start without a missing-runtime DLL error. |
| Terminal/editor/browser | Windows PowerShell 5.1 is built in; [PowerShell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows) is optional. An editor such as [VS Code](https://code.visualstudio.com/download) has a per-user installer. | Not needed for a normal terminal or per-user editor. PowerShell ZIP is an optional non-admin choice. | `$PSVersionTable.PSVersion` prints 5.1 or 7.x. |

Reopen the terminal after installers change PATH. If MySQL is not on PATH, add its actual `bin` folder to **your user PATH**, or use its full executable path with `&`. For example, `& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' --version`. Do not copy another developer's installation paths.

### Portable tools without administrator rights

Extract official Git and Node ZIP/portable packages under a folder you own. Add only their directories to the current terminal PATH, for example:

```powershell
$toolsRoot = Join-Path $env:LOCALAPPDATA 'Programs\development-tools'
# Replace these subfolder names with the folders you actually extracted.
$env:Path = (Join-Path $toolsRoot 'PortableGit\cmd') + ';' + (Join-Path $toolsRoot 'node-v24.22.1-win-x64') + ';' + $env:Path
git --version
node --version
npm.cmd --version
```

For MySQL, the official [ZIP/manual setup](https://dev.mysql.com/doc/refman/8.4/en/windows-install-archive.html) avoids service registration. Extract into a user-writable folder and use a **new, empty** data directory outside the repository. Do not initialize an existing directory. In the directory containing `bin`:

```powershell
$mysqlRoot = (Get-Location).Path
$mysqlData = Join-Path $env:LOCALAPPDATA 'eLingkodBayan\mysql-data'
if (Test-Path -LiteralPath $mysqlData) { throw 'Data already exists: do not initialize again.' }
& "$mysqlRoot\bin\mysqld.exe" --no-defaults --initialize --console "--basedir=$mysqlRoot" "--datadir=$mysqlData"
if ($LASTEXITCODE -ne 0) { throw 'Initialization failed; inspect the local diagnostic.' }
```

Record the temporary root password privately from the initialization output. Start this initialized server in its own terminal; keep that terminal running:

```powershell
& "$mysqlRoot\bin\mysqld.exe" --no-defaults "--basedir=$mysqlRoot" "--datadir=$mysqlData" --bind-address=127.0.0.1 --port=3306 --mysqlx=OFF --console
```

If 3306 is occupied by another installation, use a different unused port and pass it consistently to the client and configuration script (`-MySqlPort`). From a second terminal, connect using the temporary password:

```powershell
& "$mysqlRoot\bin\mysql.exe" --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password --connect-expired-password --get-server-public-key
```

At the MySQL prompt, change that newly initialized root password with `ALTER USER 'root'@'localhost' IDENTIFIED BY 'YOUR_NEW_LOCAL_ROOT_PASSWORD';`. Replace the placeholder yourself. This first-run action is not an instruction to change an existing installation's password. Continue below. The ZIP path was exercised with native MySQL on a non-elevated Windows process; GUI installers and a brand-new Windows OS were not automated.

## 2. Create the database and application user

MySQL **Server** is the persistent database process (normally TCP 3306). The `mysql` command is only a client that connects to it. MySQL Workbench is an optional GUI client. Prisma Studio is another optional editor for an already configured database; it is not a database server and does not replace migrations.

For the service-based path, MySQL Configurator creates/starts the service, usually `MySQL84`. `Get-Service -Name MySQL84` should show Running. Starting/stopping that Windows service may require an elevated terminal or IT. Reuse the actual service name you configured.

Connect in a second terminal using **your own MySQL administrator password**, not website credentials:

```powershell
mysql --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password --get-server-public-key
```

At the **MySQL prompt**, for a fresh installation only:

```sql
CREATE DATABASE e_lingkod_bayan_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'elingkod'@'localhost' IDENTIFIED BY 'YOUR_OWN_LOCAL_DATABASE_PASSWORD';
GRANT ALL PRIVILEGES ON e_lingkod_bayan_demo.* TO 'elingkod'@'localhost';
SELECT VERSION(), @@port, @@datadir;
SHOW STATUS LIKE 'Caching_sha2_password_rsa_public_key';
EXIT;
```

Replace the password placeholder and keep the raw password privately. If it contains a single quote, escape it using MySQL SQL syntax, or choose a generated password without quotes. Do not reuse an example password. The application user owns this one local schema, not every database. Additional create/drop-schema privileges are needed only for explicitly chosen isolated test/rehearsal tools.

For existing data, do not run this block, rename tables or reset users. Follow [existing installations](../demo/IMPORT.md).

### MySQL RSA public key

Default MySQL 8.4 `caching_sha2_password` authentication on loopback may need the server's RSA public key for the MariaDB adapter's first connection. The Prisma CLI and the application use different connection implementations; one succeeding does not prove the other can authenticate. A previously warmed authentication cache is not a reliable setup step.

Use the `public_key.pem` from **this server's** data directory (shown by `@@datadir`) or a copy of that public file in a user-readable private configuration directory. Ask the administrator to copy the public file if service-directory permissions require it. Never copy/share `private_key.pem`. Set `MYSQL_RSA_PUBLIC_KEY_PATH` to its absolute path, using forward slashes. The application and demo/import tooling read the public PEM. Do not change the MySQL authentication plugin or enable untrusted remote key retrieval to work around an incorrect key.

The [MySQL authentication documentation](https://dev.mysql.com/doc/refman/8.4/en/caching-sha2-pluggable-authentication.html) explains the RSA exchange. A separately configured trusted TLS connection can have different requirements; TLS provisioning is outside this local path.

## 3. Create private configuration

Obtain the source as in the README and run every application command from that repository root. Save Yesel's private `accounts.csv` outside the repository, then run `scripts/Initialize-LocalEnvironment.ps1`. It generates a new secret only when neither `.env` nor `.env.demo.local` exists. It never connects to or modifies MySQL.

If writing the second file fails, preserve the first file and its secret. Fix the filesystem/permission problem, then complete only the missing file from its template using the same values. Do not delete existing configuration or regenerate an established secret to retry setup.

| Value | Required / purpose |
|---|---|
| `DATABASE_URL` | Required. Your local MySQL application username/password, host/port and schema. |
| `BETTER_AUTH_SECRET` | Required, randomly generated 32 bytes or more. Retain it across restarts. |
| `BETTER_AUTH_URL` | Required. `http://localhost:3000` for this path; use the same browser origin. |
| `NEXT_PUBLIC_APP_URL` | Set to the same local origin for application links. It is public, not a secret. |
| `MYSQL_RSA_PUBLIC_KEY_PATH` | Required when the server/adapter needs RSA pinning; this server's readable public PEM. |
| `DEMO_DATABASE_URL`, `DEMO_AUTH_SECRET`, `DEMO_BASE_URL` | In ignored `.env.demo.local`; same database/secret/origin for initial fixture loading. Demo guards restrict the database name. |
| `DEMO_ACCOUNTS_FILE` | In `.env.demo.local`; absolute private catalogue path, not credentials embedded in source. |

There is no required external map, font, storage or email service for local browsing/login. Documents are protected database blobs; do not place IDs in `public`. Mail configuration is optional and server-only, as explained below.

### Manual configuration alternative

If local script execution is blocked by machine policy, use the editor to create `.env` from tracked [.env.example](../.env.example), without overwriting an existing file. Generate the secret and a URL-encoded connection string in PowerShell:

```powershell
# New installation only. Keep the generated output private.
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$secretBytes = New-Object byte[] 32
try { $rng.GetBytes($secretBytes) } finally { $rng.Dispose() }
[Convert]::ToBase64String($secretBytes)
[Uri]::EscapeDataString((Read-Host 'Raw MySQL username'))
# Encode the raw password with the same API in a private terminal/editor;
# the supplied script handles a SecureString without printing it.
```

Use `mysql://ENCODED_USER:ENCODED_PASSWORD@127.0.0.1:3306/e_lingkod_bayan_demo`. Encode each credential component **once**; never encode the whole URL. Characters such as `@`, `#`, `%`, `:` and `/` need percent-encoding. At a MySQL password prompt, enter the original raw password. In dotenv files, quote values and use forward slashes in paths. Do not prefix secrets with `NEXT_PUBLIC_`.

Create `.env.demo.local` using [demo/demo.env.example](../demo/demo.env.example), set the same secret/database, `DEMO_BASE_URL=http://localhost:3000`, the private CSV path and public PEM path. The optional restore URL is unnecessary for installation.

Avoid conflicting `.env.local`, mode-specific files and inherited `DATABASE_URL` process overrides. Next.js has [documented environment precedence](https://nextjs.org/docs/app/guides/environment-variables); the Prisma CLI reads root `.env`, while the fixture runner reads its explicit demo file. `Test-Path Env:DATABASE_URL` detects a shell override without printing it. Never paste an environment dump into a report.

## 4. Dependencies, schema and demo

Return to README steps 4–5. `npm.cmd ci` downloads the lockfile and runs `postinstall` generation. No global Prisma install is needed. `db:migrate` uses **migrate deploy**, not reset/dev/db push. On a fresh database it applies the current 29 directories under `prisma/migrations`. Do not import the old SQL export before or after this sequence.

Demo setup requires the matching private catalogue before writing accounts. It creates only the documented reserved-domain synthetic identities. `demo:verify` checks account roles, survey/import counts, authorization and actual sign-in; allow several minutes. A mismatch or interrupted operation is an error, not permission to clear data or change passwords. Keep its checkpoint and see [demo recovery](../demo/README.md).

## Daily start, stop and restart

1. Start the existing MySQL service or portable server, using the same data directory and port. Do not initialize it again.
2. In the repository root, run the README development command. Keep that terminal open. Open `http://localhost:3000` and use the matching website credentials.
3. Stop the website with Ctrl+C. Restart with the same command; records persist in MySQL.
4. If stopping MySQL is necessary, stop the website first. For a service use its configured service control with authorized elevation. For a portable server, from a second terminal run `mysqladmin --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --password shutdown`; wait for its server terminal to exit. Preserve its data directory.

Development uses `npm.cmd run dev`; production locally uses `npm.cmd run build` followed by `npm.cmd run start -- --hostname 127.0.0.1 --port 3000`. Both need the same configuration/schema. Production does not permit test mail capture. Never run two apps on the same port or silently switch the database URL to a review fixture.

## Optional services

- Password recovery: `RESEND_API_KEY` and `PASSWORD_RESET_FROM` (or `STAFF_INVITE_FROM` fallback), a provider-verified sender and correct auth origin. See [recovery setup](PASSWORD-RECOVERY.md). Generic request confirmation does not prove delivery; without a sender, real mail is unavailable.
- Staff invitations: [mail/activation configuration](STAFF-INVITATIONS.md). Do not configure a real sender merely to test fixtures.
- Prisma Studio: `node node_modules/prisma/build/index.js studio --port 5555 --browser none` opens an optional direct database editor. It bypasses application permissions; never use it as a migration/seed replacement.

See [troubleshooting](LOCAL-DEVELOPMENT.md) and [existing installations](../demo/IMPORT.md) before changing an established environment.
