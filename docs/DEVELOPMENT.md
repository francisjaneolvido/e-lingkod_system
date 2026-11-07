# Development and verification

Start with [Windows setup](WINDOWS-SETUP.md) for a new installation or [existing installations](../demo/IMPORT.md) for a database upgrade. Use the locked dependencies; the generated Prisma client is local output and must not be edited by hand.

## Everyday commands

Run these commands from the repository root in Windows PowerShell 5.1 or PowerShell 7.

| Command | Effect |
| --- | --- |
| `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000` | Ensures Prisma generation and starts development. |
| `npm.cmd run db:generate` | Generates the local client without changing the database. |
| `npm.cmd run db:migrate` | Applies pending migrations to the configured database. Back up and review an existing installation first. |
| `npm.cmd run typecheck` | Ensures matching generated output and checks TypeScript. |
| `npm.cmd run test:all` | Runs repository tests, including integration tests when their disposable-target guards are configured. |
| `npm.cmd run lint -- <paths>` | Checks the changed source files. |
| `npm.cmd run build` | Builds the application locally; does not deploy or migrate. |
| `npm.cmd run start -- --hostname 127.0.0.1 --port 3000` | Serves the completed local production build. |

Stop the web server with Ctrl+C. Starting it again uses the same configured database and authentication secret. MySQL is a separate process or Windows service; stopping the web server does not stop MySQL.

## Database and browser tests

Use only disposable schemas and synthetic fixtures for tests that change data. The maintained runners enforce their target-name and explicit-configuration guards. Never substitute an ordinary application connection to make a guarded test run.

`npm.cmd run demo:verify` checks the dedicated demo's records and authenticates its catalogue accounts. It requires the private catalogue supplied by Yesel; passwords are not distributed in the repository. See [demo instructions](../demo/README.md) for configuration and fixture details.

The scripts in `scripts/verify-*.mjs` prepare isolated integration environments. Read the selected runner's configuration and supported arguments before starting it; these are maintenance tools, not normal application startup. A skipped guarded test means that integration behavior was not exercised by that run.

Browser tests in `tests/*browser*.mjs` require a compatible installed Playwright browser and their documented disposable preview origin. Keep browser contexts separate when reviewing normal and synthetic accounts: cookies are scoped by host rather than port. Verify the signed-in role before checking a protected workflow.

For navigation changes, exercise Back/Forward, reload, keyboard focus, touch dismissal and narrow layouts. Open menus and drawers during testing. Analytics checks should cover applied versus draft filters, Clear barangay, Reset filters, request races, details and exports using the same authorized view. Check Light, Dark and OLED, reduced motion and zoom. See [UI behavior](RELEASE-2-UI.md) and [geographic data](barangay-geometry.md).

## Generated files and local configuration

`postinstall`, development, build, TypeScript and repository test workflows ensure the Prisma client is available. Keep `src/generated/prisma/`, `node_modules/`, build output, private environment files, uploaded documents, mail captures, database exports and credentials out of Git. Track `tsconfig.json`; review intentional Next.js changes rather than ignoring it.

Share failures with the command, tool versions, source revision and a sanitized diagnostic. Remove account credentials, sessions, reset links, private documents and ordinary database records. Keep existing baseline diagnostics separate from new failures.

## Private CLI browser journeys

The maintained `tests/demo-browser.js` and `tests/hackathon-journeys.js` are credential-free Playwright CLI templates. They refuse to run before any browser action unless prepared with the private catalogue. The CLI sandbox cannot read a local catalogue itself. Generate a private runnable file outside the repository; do not paste credentials into a tracked test.

```powershell
$browserWork = Join-Path $env:LOCALAPPDATA ('eLingkodBayan\browser-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $browserWork | Out-Null
$privateJourney = Join-Path $browserWork 'demo-journey.js'
node scripts/prepare-demo-browser.mjs --journey=demo "--output=$privateJourney"
if ($LASTEXITCODE -ne 0) { throw 'Private journey preparation failed.' }
# With the optional Playwright CLI/browser already installed:
playwright-cli run-code "--filename=$privateJourney"
```

Preparation reads `DEMO_ACCOUNTS_FILE` from the normal private demo configuration, or accepts an explicit `--accounts-file=...`. It refuses existing output and paths inside the repository. The generated file contains passwords: keep it private, exclude it from reports and never commit it. The demo journey targets the dedicated demo on3102 and includes synthetic form updates; run it only against disposable fixtures. The `existing` template targets its separately documented localhost3105 journey and must likewise be used only on an isolated synthetic installation, never the ordinary development database. Review its origin before running. These optional browser tools are not required for application startup.
