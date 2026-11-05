# Citizen ID review and release setup

New public registration creates a limited Citizen account, then opens `/verification` for the required ID submission. Citizen reports, requests, surveys, profiles, notifications and personal recommendations are unavailable until an authenticated Admin approves the current document revision. Public browsing, verification/status/document correction, password recovery and sign-out remain available. There is no automatic approval or minimum wait. The 24–72-hour review window is an estimate.

Identity review is separate from email verification, roles and module permissions. Password recovery changes none of those. Existing accounts receive explicit **LEGACY** classification during migration: access is preserved without claiming an ID was submitted or verified. Existing Admin access and invitation-based Staff activation remain role-controlled. New inserts default to **SUBMISSION_REQUIRED**; public clients cannot choose role, legacy classification or approval. Native identity-profile edits are blocked because no account identity-change workflow has been authorized; otherwise they could invalidate a reviewed snapshot.

## Migration and private storage

The additive `20261105010000_citizen_identity_review` migration adds User status/version, separate immutable identity submission/review tables, and Better Auth's database-backed `rateLimit` table. It does not repurpose Better Auth `verification` tokens or delete existing data. It first classifies existing users as LEGACY, then changes the default for future inserts. Do not start the new code against the old schema.

Use the maintained [backup and rehearsal guidance](LOCAL-DEVELOPMENT.md#pending-migrations-backup-and-rehearsal) before any reviewed ordinary migration. The importer does **not** authorize this new migration. The release verification runner rehearses only on a fresh disposable local schema, with a synthetic existing user and exact field-preservation checks. That is not a backup or restoration test of your ordinary database.

After independent review and your separately approved backup/rehearsal, the normal user-run deployment sequence is `node node_modules/prisma/build/index.js migrate status`, inspect the pending migration, `npm.cmd run db:migrate`, then `npm.cmd run db:generate`, and restart. Stop on errors; do not reset, force-push a schema or alter migration history. Test with synthetic accounts before collecting real documents.

Private ID storage reuses MySQL blobs, matching existing service-document storage. No bucket, public assets directory or new storage credential is required. `citizen_identity_submission.data` is a private MEDIUMBLOB. The application DB principal must read/write the new tables; normal database backup/access restrictions also cover ID data. Do not serve the database or its files publicly. No ID bytes are serialized into React props or queue JSON.

Uploads accept **JPG/PNG up to 5 MiB and 24 million decoded pixels**, one image per revision. The multipart body has a bounded 5 MiB + 16 KiB envelope. Declared MIME must match decoded format. A complete decode and JPEG re-encode strips metadata and untrusted trailing content; the stored copy is a sanitized image, not a forensic original. Animated/multipage, unsupported, malformed and oversized content is rejected. Ensure MySQL `max_allowed_packet` can accommodate the bounded image plus query overhead (at least 8 MiB is suitable for this limit); a lower server limit causes a safe failed upload that can be retried after configuration is corrected.

The owner and current Admin reviewers retrieve images only through `/api/identity/documents/[id]`. Staff and other Citizens cannot retrieve another account's ID. Responses use JPEG, private/no-store caching, `nosniff`, a restrictive sandbox CSP and same-origin resource policy. Screens open protected images in a new tab; they never publish an ID URL or forward an ID through analytics.

The request is buffered within its limit and persisted atomically with its revision and pending state. There are no temporary filesystem uploads to clean up. Interrupted parsing/decoding creates no stored document. An interrupted response after commit can be retried with the same submission key/content without duplication. A changed payload/key or stale version requires refresh. Every new revision must receive its own decision; old approval cannot transfer. Pending/approved/legacy documents cannot be silently replaced. Corrections/rejections permit resubmission on the same account.

## Review and policy

Admins open **Registered citizens → Review Citizen IDs and verification status** (`/admin/citizens/verification`). The queue has status totals, filters, search and 20-account pagination. Open an account for current details, exact submitted details, protected document and review history. Choose Approve, Request corrections or Reject and provide a clear reason. The server records the reviewer and timestamp, and checks the exact document revision/account version. A stale or concurrent second action receives a conflict; refresh rather than guessing whether it saved. An interrupted response requires checking history before retrying.

Use the established requirement wording, “valid government-issued ID or accepted identity document.” This release adds **no** legal residency criteria, age requirement, document-type eligibility list, biometric matching or retention duration. An operating authority still needs to confirm accepted documents, the handling of identity changes and a retention/deletion policy before real collection. Do not claim legal identity certification or government endorsement. No timer enforces approval. Review reasons should explain the action without copying ID numbers or unnecessary personal data.

## Local automated verification

Run from the repository root with an explicitly selected local configuration file. The file is read without modification; its ordinary database is never migrated or written by this runner:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    node scripts/verify-site-release.mjs --env 'C:\YOUR\PRIVATE\local.env'
    if ($LASTEXITCODE -ne 0) { throw 'Disposable verification failed' }
}
```

The runner creates `elb_site_release_test_<random hex>` on loopback, applies/rehearses migrations, runs real Better Auth/API and document lifecycle tests and drops only that new schema. It compares schema drift to actual HEAD and verifies a preserved legacy user and auth token. The local connection needs CREATE/DROP DATABASE and trigger privileges for the recovery rollback test. `--build` builds into ignored `.scratch/site-release/production-next`; `--serve` uses `.scratch/site-release/dev-next`, prepares synthetic role fixtures and runs port 3115 until Enter/Ctrl+C. Captured mail is configured only for the guarded nonproduction test server; production capture is refused. Captures and generated synthetic ID images stay private. See [password recovery](PASSWORD-RECOVERY.md) and [photo replacement](hero-photos.md).

## Role-by-role acceptance walkthrough

- Guest: browse services/reports tracking; register structured details. Confirm the account goes to Verification status and direct Citizen API requests are denied.
- Pending Citizen: submit a synthetic ID, view submission time/pending state, open your protected image, recover password and sign out. Try protected page/API URLs and another account's image URL. The status remains pending after recovery.
- Admin: open queues, search/filter/page, inspect submitted details and protected preview, request corrections with a reason. In another tab keep the old review open. After resubmission, the old decision must fail with a refresh message. Approve the new revision and inspect reviewer/time/history. Test rejection and two simultaneous decisions with synthetic accounts.
- Approved Citizen: sign in with the same account and exercise reports/services/profiling/opportunities. Attempts to replace an approved ID or change identity fields through native auth APIs must fail.
- Legacy Citizen: confirm existing workflows still operate and classification says legacy, never ID-verified.
- Staff: activate a genuine synthetic invitation issued by Admin; confirm granted module access and denied ID-review queues/previews. Staff module/barangay scope stays independent.
- All roles: keyboard and touch at desktop/tablet/mobile in Light/Dark/OLED. Essential actions are visible, errors give retry guidance, sign-out works and focus stays usable. Manual local acceptance by the user remains deferred; current automated evidence is recorded in the private review package.
