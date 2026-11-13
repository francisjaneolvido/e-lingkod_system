# eLingkod Bayan

eLingkod Bayan brings citizen requests and local-government work into one application. It is designed for residents, establishment representatives and authorized office staff, with workflows focused on Los Baños, Laguna.

The project addresses repeated encoding, paper-based processing, unnecessary visits, fragmented records, accessibility barriers and limited visibility into a request's progress. Citizens can submit information, follow their next step and view status history. Staff work from scoped queues; administrators manage access and reviews. The project does not claim official municipal endorsement, production deployment or a live connection to government systems.

## Six modules

| Module | Main tasks |
|---|---|
| Civic reporting | Submit concerns with photos/location, track handling and provide resolution feedback. |
| Online LGU services | Complete requests, submit protected documents, respond to corrections and arrange pickup/release. |
| Emergency information | Find hotlines and advisories; authorized staff maintain and publish updates. |
| Municipal projects and services | Browse published projects, reviewed progress and the office directory. |
| Citizen profiling | Save individual and establishment survey drafts, consent and submission history. |
| Workforce census and social profiling | Manage protected records/imports, scoped charts/maps/exports, assistance rosters and opportunities. |

Citizens access their own records. Establishment representatives use Citizen accounts. Staff need explicit module and geographic/office permissions. Admins manage access and authorized review. New public registrations require ID submission and Admin approval before Citizen features become available. Existing accounts retain their explicit legacy classification, which does not claim their IDs were verified.

Public census analytics remains deferred. Opportunity suggestions use optional consent; the application does not forward profiles, submit applications or guarantee employment.

## Architecture

| Layer | Implementation |
|---|---|
| Application | Next.js 16.4.2 App Router, React 19.3 and TypeScript; server-side authorization on pages, APIs and exports. |
| Interface | Tailwind CSS 4 and shared styles; locally bundled fonts; Light, Dark and OLED modes. |
| Data | MySQL 8.4, Prisma 7.10.1 and the MariaDB adapter. Prisma Client is generated, not committed. |
| Authentication | Better Auth 1.7.11; database sessions, expiring reset tokens and separate citizen ID review. |
| Analytics | Eligible source-row aggregates and local vector barangay geometry. No external map key or public census endpoint. |

Use `package-lock.json` for application dependency versions. ID and service documents use protected database storage, not public assets. Read the [analytics definitions](docs/PROTECTED-BARANGAY-ANALYTICS.md), [geometry provenance/licence](docs/barangay-geometry.md) and [UI conventions](docs/RELEASE-2-UI.md).

## Install on Windows

This primary path creates your own **synthetic development database**, `e_lingkod_bayan_demo`, and runs the normal website on port 3000. It does not reproduce another developer's ordinary database. Yesel supplies the private website credential catalogue; you install and configure everything else locally.

### 1. Install the tools

Install [Git for Windows](https://git-scm.com/install/windows), [Node.js 24 LTS](https://nodejs.org/en/download) with npm, and [MySQL Community Server 8.4](https://dev.mysql.com/downloads/mysql/8.4.html). Use Windows PowerShell 5.1 or PowerShell 7. A browser and editor are sufficient; Workbench and Prisma Studio are optional.

Follow [Windows setup](docs/WINDOWS-SETUP.md) for versions, installer choices, administrator requirements, portable alternatives, PATH, server startup and RSA configuration. Open a new PowerShell terminal:

```powershell
git --version
node --version
npm.cmd --version
mysql --version
```

Each command should print its version. Fix a missing tool before continuing. `npm.cmd` avoids the PowerShell script-policy issue; no global execution-policy change is required.

### 2. Obtain the source and create your database

```powershell
git clone https://github.com/francisjaneolvido/e-lingkod_system.git
Set-Location -LiteralPath .\e-lingkod_system
```

If the release has not merged, switch to the reviewed release branch supplied by the maintainer. Private repository access may require authorization from the owner. Create the empty database and your own local MySQL user using [the database steps](docs/WINDOWS-SETUP.md#2-create-the-database-and-application-user). Website passwords from `accounts.csv` are not MySQL passwords.

### 3. Create private configuration

Keep Yesel's `accounts.csv` outside the repository. From the repository root:

```powershell
& .\scripts\Initialize-LocalEnvironment.ps1
```

The script asks for your local MySQL credentials, the private catalogue path and this server's public PEM when required. It URL-encodes credentials and generates a 32-byte authentication secret. It creates ignored `.env` and `.env.demo.local` files and refuses to overwrite either. If machine policy blocks local scripts, use the [manual configuration alternative](docs/WINDOWS-SETUP.md#3-create-private-configuration), without weakening policy.

### 4. Install, migrate and load the synthetic dataset

Run each command only after the preceding command succeeds:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run demo:setup
npm.cmd run demo:verify
```

`npm ci` installs locked dependencies and generates Prisma Client; explicit generation verifies that step independently. Migration should report all available migrations applied or no pending migrations. Setup generates records from distributed fixture definitions and uses the private catalogue for passwords. Verify checks the dataset and authenticates its accounts without printing passwords.

The supported fixture has **108 accounts: 100 Citizens (80 individuals and 20 establishment representatives), four Staff and four Admins**. It includes survey histories, imports, scoped census/assistance examples and labelled demonstration opportunities. This differs from the 111 accounts reported in one developer's ordinary database. See [demo data and access](demo/README.md) for scope and safeguards.

### 5. Start and sign in

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Wait for Next.js to report readiness, then open **http://localhost:3000**. Use a Citizen, Staff or Admin entry from the matching private catalogue. Keep the browser hostname consistent with `BETTER_AUTH_URL`; binding to `127.0.0.1` does not change the browser origin.

## Daily use

Start MySQL first, then run the development command from the repository root. Stop Next.js with Ctrl+C in its terminal. Restarting the website does not reset data. A MySQL Windows service can remain running; a portable server must run separately. See [start/stop instructions](docs/WINDOWS-SETUP.md#daily-start-stop-and-restart). Do not rerun setup/imports as a daily startup step.

For a local production build, stop the development server, run `npm.cmd run build`, then `npm.cmd run start -- --hostname 127.0.0.1 --port 3000`. Build/start does not deploy or migrate the application.

## Civic report GPS and image checks

Add `OPENAI_API_KEY` to your private `.env` to enable new report submissions. The default `OPENAI_VISION_MODEL=gpt-4o-mini` can be changed to another vision model that supports structured output. Each uploaded photo is checked for unsafe content, then assessed against the actual report category and description. Citizens receive a result for each photo; rejected or unclear photos must be replaced. Submission performs the same checks again on the server, so edited browser requests cannot bypass them. If the API is not configured or unavailable, new reports cannot be submitted. Existing reports are unchanged; their older photos show as not checked.

For automatic readable addresses, get a Geoapify Reverse Geocoding key and set `GEOAPIFY_API_KEY` privately in `.env`. Without it, citizens can still enter their own address or landmark and adjust the map pin. Browser GPS requires localhost or HTTPS and the citizen's permission. GPS is requested on opening the form; it captures the citizen device's current position, so citizens should only use it when at the incident site. The saved timestamp and accuracy are estimates supplied by the browser, not independent proof of an incident location. The admin desk map displays saved citizen coordinates for the accessible and currently loaded cases, with category, status and location search filters. OpenStreetMap attribution is included.

After pulling this change, run `npm.cmd ci`, `npm.cmd run db:generate`, `npm.cmd run db:migrate`, then restart the app. Keep API keys out of Git. Test with a relevant image, an unrelated image, a category change, denied GPS permission, and manual location; the AI decisions should be reviewed by LGU staff for important cases.

## Existing installations and optional services

- **Existing data:** preserve configuration, accounts and records. Follow [backup, migration review and additive import](demo/IMPORT.md). A full SQL restore is never an additive merge. Do not run fresh-install setup against ordinary data.
- **Mail:** login and browsing need no provider. Recovery and invitation delivery need server-only sender configuration. Without it, real delivery is unavailable. See [password recovery](docs/PASSWORD-RECOVERY.md) and [staff invitations](docs/STAFF-INVITATIONS.md). Local capture is not real delivery.
- **ID review:** [review rules and protected storage](docs/CITIZEN-IDENTITY-REVIEW.md). Synthetic legacy fixtures do not bypass public registration review.
- **Maintenance:** [troubleshooting](docs/LOCAL-DEVELOPMENT.md), [photo replacement](docs/hero-photos.md) and [developer verification](docs/DEVELOPMENT.md).

Never commit private configuration, credential catalogues, database exports, sessions, reset links or uploaded documents. Fonts and geographic data retain their bundled licences and attribution.
