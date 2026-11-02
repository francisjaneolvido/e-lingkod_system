# Local MySQL RSA authentication

[Troubleshooting](07-troubleshooting.md) · [Environment example](../.env.example)

MySQL 8.4 accounts using `caching_sha2_password` require full authentication
after server restart or when the authentication cache is empty. On a connection
without TLS, the client needs the server's RSA public key. A warm cache can make
an incomplete configuration appear to work. The direct MariaDB connector reports
`ER_CANNOT_RETRIEVE_RSA_KEY` (45044); Prisma's pool may instead report connection
acquisition timeout 45028.

## Configure the public key

1. Locate **the running server's** `public_key.pem` in its configured data
   directory. For the portable Windows setup, check from the repository root:

   ```powershell
   & {
     $ErrorActionPreference = 'Stop'
     $keyPath = Join-Path $env:LOCALAPPDATA 'e-lingkod-mysql/data/public_key.pem'
     if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
       throw 'Public key not found. Check the running MySQL server data directory.'
     }
     (Resolve-Path -LiteralPath $keyPath).Path.Replace('\', '/')
   }
   ```

2. In your ignored root `.env`, add `MYSQL_RSA_PUBLIC_KEY_PATH` with that resolved
   absolute path. Keep existing database credentials and other settings:

   ```dotenv
   MYSQL_RSA_PUBLIC_KEY_PATH="C:/path/to/mysql-data/public_key.pem"
   ```

   Replace the placeholder. `.env` does not expand `%LOCALAPPDATA%`; use the
   resolved value. Use the **public** PEM, never `private_key.pem`. Do not copy a
   key from another MySQL instance or commit your machine-specific configuration.
   The optional setting is also shown in the tracked root `.env.example`.

3. Stop your Next.js process with Ctrl+C and restart with `npm.cmd run dev`.
   Prisma reuses a process-level client, so a full restart is needed. Check for
   an overriding process variable or `.env.local` if the old setting persists.

An explicitly configured unreadable file produces a `MYSQL_RSA_PUBLIC_KEY_PATH`
error identifying the setting to check. A missing/wrong PEM is a configuration
problem: keep the existing authentication plugin, users and passwords. The
application does not enable `allowPublicKeyRetrieval`, downgrade authentication,
or change connection/TLS settings. This setting configures the application
Prisma adapter; it does not reconfigure standalone database tools.

RSA protects password exchange, not all query traffic. This optional local
setting is not a substitute for an appropriate TLS configuration on remote
connections.

## Repeat the cold-cache regression

From the repository root, with MySQL 8.4 installed and dependencies available:

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $env:MYSQLD_BINARY = 'C:\path\to\mysql-8.4\bin\mysqld.exe'
  if (-not (Test-Path -LiteralPath $env:MYSQLD_BINARY -PathType Leaf)) {
    throw 'Set MYSQLD_BINARY to your installed MySQL executable.'
  }
  node scripts/verify-mysql-rsa.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Cold-cache MySQL regression failed.' }
}
```

The runner initializes a new temporary data directory and a loopback-only server
on an ephemeral port. It verifies server identity, provisions a synthetic account
only there, and clears **that disposable server's** authentication cache before
each attempt. It checks direct failure without a key, application-adapter failure
without a key, and application-adapter `SELECT 1` success with the public PEM.
It stops its own server and removes its temporary data afterward. It never reads
the ordinary `.env`, migrates/seeds the application database, or flushes the
ordinary server's cache. Do not run `FLUSH PRIVILEGES` on your ordinary database
to reproduce this test.

Cleanup attempts SQL shutdown, connection closure, owned-process termination
and log closure independently. Each wait is bounded. Original verification and
cleanup errors remain visible and cause a failing exit. If process termination
cannot be confirmed, the runner retains its temporary directory rather than
deleting live server data; inspect the reported path and process before removal.

Without this runner, the guarded database test is skipped by `node --test`;
a skipped result is not cold-authentication verification.

References: [MariaDB connector connection options](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options)
and [MySQL 8.4 authentication/cache behavior](https://dev.mysql.com/doc/refman/8.4/en/caching-sha2-pluggable-authentication.html).
