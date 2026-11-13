# e-Lingkod Bayan — Targeted GPS continuation (existing branch)

This package was prepared from the exact three files supplied in `civic-current-code.zip`:

- `src/features/civic/components/location-picker.tsx` (modified)
- `src/features/civic/server/evidence.ts` (read only, **not overwritten**)
- `src/features/civic/server/mutations.ts` (read only, **not overwritten**)

New files: `src/features/civic/gps-selection.ts` and `tests/civic-gps-continuation.test.mjs`.

## What changes

1. On opening the incident form, a short-lived high-accuracy GPS watch starts automatically (HTTPS or localhost and browser permission required).
2. The earliest valid fix fills latitude/longitude, its reported accuracy and capture timestamp. During the following ~25 seconds, only better valid fixes move the map pin, with a target of 15 meters. There is **no accuracy guarantee**.
3. The Refresh Location control restarts capture. When a citizen has manually pinned the incident, the control clearly says **Replace pin with my GPS**; passive GPS never overrides manual selection.
4. Existing `InteractiveMap`, `reverse-geocode` API, barangay/address inputs and no-coordinate fallback remain in place. Pending geocodes are canceled after pin changes; manually edited addresses are not overwritten.
5. The GPS watch and pending lookups are canceled on unmount and while the report is being submitted.
6. Existing AI: `mutations.ts` already calls `analyzeEvidence(photo.data, fields.category, fields.title, fields.description)` for **each** prepared image and rejects non-ACCEPTED results **before** `prisma.civicReport.create`. Existing `evidence.ts` uses moderation and the OpenAI vision Responses API, fails closed when unavailable, and retains its existing setup. We intentionally make no duplicated AI integration.
7. Existing report persistence and admin detail map/coordinates are not changed by this patch. Verify those flows in your running app, because the uploaded ZIP did not include the repository's database schema, admin components, or full runtime.

## Apply on Windows PowerShell

Use a **clean, non-main** Git branch. Protect your prior work by stashing or committing it before starting.

```powershell
git status --short
git branch --show-current
python "$env:USERPROFILE\Downloads\e-lingkod-civic-targeted-continuation\apply_patch.py" . --check
python "$env:USERPROFILE\Downloads\e-lingkod-civic-targeted-continuation\apply_patch.py" .
git diff --stat
git diff -- src/features/civic/components/location-picker.tsx
```

The installer checks the **logical text SHA-256** of `location-picker.tsx` against the uploaded original, even with CRLF Windows line endings. It refuses to run on a dirty tree, main/master, changed source, or existing new-file paths. It never touches the database, existing `evidence.ts`, or `mutations.ts`.

After verifying the diff:

```powershell
npm ci
node --test tests/civic-gps-continuation.test.mjs
npm run test:civic
npm run typecheck
npm run build
```

`npm ci` must finish before test/build. On Windows, close any running Next.js process if `EPERM` indicates that `next-swc.win32-x64-msvc.node` is locked. Do not stop unrelated Amazon Q processes. If `npm ci` remains locked, restart Windows before retrying.

To commit only patch files:

```powershell
git add src/features/civic/components/location-picker.tsx src/features/civic/gps-selection.ts tests/civic-gps-continuation.test.mjs CIVIC-GPS-CONTINUATION.md
git commit -m "feat(civic): improve automatic high-accuracy GPS capture"
```

## Configure and validate

Your existing server-side `OPENAI_API_KEY` is used by `evidence.ts`, and `OPENAI_VISION_MODEL` controls its model (default `gpt-4o-mini`). Keep `.env` untracked. An OpenAI key is required by the existing AI flow for new photo submissions. Do not duplicate `CIVIC_AI_MODEL` (that was used only by the **superseded** generic patch).

Manually test with permissions allowed/denied, slow or unavailable GPS, improved readings, map-click/drag and coordinate edits, reverse-geocoding with and without a configured Geoapify provider, submit after pinning elsewhere, admin report detail and saved coordinates, relevant and unrelated category photos, and AI service interruption. The test suite is unit/contract-level, not an end-to-end database/browser verification.

Do **not** run the superseded general GPS + AI installers after this targeted patch.
