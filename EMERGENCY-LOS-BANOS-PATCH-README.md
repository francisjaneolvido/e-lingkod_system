# E-Lingkod Bayan — Los Baños Emergency Hotlines & Alerts Patch

Based on `e-lingkod-bayann(9).rar` (latest upload; October 22, 2026). This patch has **changed/new files only**. It is designed to preserve other local changes, though you should back up before overwriting existing files.

## Install in VS Code PowerShell

1. Back up your local project and MySQL database. Stop `npm run dev` with Ctrl+C.
2. Extract the patch ZIP **into the root** of your existing `C:\e-lingkod-bayan` project, preserving the `src/`, `prisma/`, `tests/` folder structure (merge/overwrite changed files only). Example:

```powershell
cd C:\e-lingkod-bayan
Expand-Archive -LiteralPath "$HOME\Downloads\e-lingkod-bayan-emergency-los-banos-patch.zip" -DestinationPath "C:\e-lingkod-bayan" -Force
npm install
npm run db:migrate
npm run db:generate
npm run dev
```

The Prisma migration creates **four new tables**: `emergency_hotline`, `emergency_hotline_proposal`, `emergency_alert`, and `emergency_action_log`. It does NOT drop tables, clear previous requests, or delete user data. **Do not run `db:clear-data` or `prisma migrate reset`.**

If `npm run db:migrate` fails, stop and inspect the error rather than running a destructive reset. Use `npm run typecheck` and `npm run test:all` after installing dependencies.

## Screens

- **Citizen/public:** `http://localhost:3000/emergency` (no login). On a phone connected to the dev server, `tel:911` and `tel:143` open the phone's dialer; some devices require confirming the call. For mobile access on the LAN, use your PC's local network IP rather than `localhost` on the phone, and configure development-host/auth settings appropriately. Do NOT expose the development server or prototype directly to the internet.
- **Admin:** `http://localhost:3000/admin/emergency` (Admin permission; full directory and alert review).
- **Staff:** Same admin URL; staff must have the `EMERGENCY` module enabled **and** be assigned to an eligible LGU office (MDRRMO, PIO, Operations Center, MHO, MSWDO). Admin manages these in Staff Directory. An office suggestion does not automatically grant permissions.

## Demo walkthrough

1. Public visitor opens `/emergency`, sees national 911 and Philippine Red Cross 143 without needing to sign in. Search, filter by hotline category, tap **Call**, or **Copy**.
2. Staff (MDRRMO/PIO) opens Emergency desk → **Hotlines**. Staff suggests new local PNP/BFP/MDRRMO/hospital number with official HTTPS verification source. Staff can also propose changes to an existing contact. Pending suggestions are **not public**.
3. Admin reviews source, verifies the number and clicks **Verify & publish**. Only then does the local number appear publicly. Admin can unpublish an outdated number. To reactivate, submit an updated proposal and verify again.
4. Staff opens **Advisories**, creates a draft with severity, official issuing office and source, safety instructions, start/expiry and affected barangays. Save → Submit for review.
5. Admin validates the source → Approve & publish or Return with reason. Citizen sees only published advisories **within their active date window**, filtered by the selected barangay. Admin may archive an outdated advisory.
6. No fake live emergencies are seeded; the default alert feed is empty. All actions are logged to `emergency_action_log`.

## Los Baños setup and sourcing

The 14 barangays are sourced from the municipal website (`https://losbanos.gov.ph/`): Anos, Bagong Silang, Bambang, Batong Malake, Baybayin, Bayog, Lalakay, Maahas, Malinta, Mayondon, San Antonio, Tadlac, Timugan (Poblacion), and Tuntungin-Putho.

National hotline sources:
- 911: https://ehotlines.e.gov.ph/
- Philippine Red Cross 143: https://redcross.org.ph/contact-us/

**Local verification lead, not an automatically published emergency number:** Los Baños' official contact page (`https://losbanos.gov.ph/sendmail`) lists Operations Center **530-2981 local 1000**, Municipal Health Office **530-2981 local 4004**, MSWDO **530-2981 local 1016**, and PIO **530-2981 local 3017**. Confirm dialing prefix, availability and extensions directly with the relevant office before allowing Admin to publish any of these as callable contacts. Third-party directory numbers should not be treated as verified simply because they appear online.

The website is a **hackathon prototype**, not a municipal government service, official alert broadcaster, or automatic emergency dispatch system. Validate content against the municipality and government agencies before public deployment.

## Security and functionality

- Hotline proposals and alerts require a current Better Auth LGU user with EMERGENCY permission. Eligible Staff department is verified server-side.
- Only Super Admin can approve/publish hotline proposals or alerts, or archive public entries.
- Cross-site writes are blocked by `assertSameOrigin` and verified with current DB-based roles.
- Reference URLs must be HTTPS. Numbers are normalized to dialer-safe characters, all 14 barangays validated, alert validity maximum 30 days.
- Public visitor only receives active verified contacts and published currently-active advisories, not drafts, history, or private staff details.
- If the database cannot be read, public page still shows national 911 and 143 and warns that local feeds are unavailable.
- No native push notifications/PWA offline support yet; these remain optional Phase 2. Browsers cannot silently place calls or guarantee delivery of emergency notifications.

## Testing status

Existing Node tests and new targeted tests passed in an isolated extraction. TypeScript/JSX syntax compilation checked; full Next.js build, Prisma generator, live MySQL migration, and interactive mobile/browser tests **not executed in the isolated environment** because the project dependencies/database were not available. Run the commands above on the local developer machine.
