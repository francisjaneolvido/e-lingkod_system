# E-Lingkod Bayan — Document Preview Fix

Based on the previously uploaded E-Lingkod Bayan project and the earlier Staff Office + Document Pickup patches.
This ZIP contains changed/new files only. It does not contain `.env`, databases, or the entire project.

## Fixes

1. Fixes the 500 error when Staff opens a citizen-uploaded document:
   `ReferenceError: resolveServiceDefinition is not defined`.
   The document route now imports the server-side service resolver, preserves access control,
   and restricts inline display to the existing accepted MIME types (PDF, JPG, PNG, WEBP).
2. Adds previews directly within the **Citizen** Online LGU Services request details:
   images are displayed immediately after the successful upload and page refresh; PDFs appear in an embedded viewer.
3. Adds the same inline previews to the **Admin/Staff Requirements verification** section.
   Users can still click **Open original** in a new tab. Protected documents remain session-authenticated.
4. Adds `data-scroll-behavior="smooth"` to the app HTML tag to address the Next.js navigation warning.
5. Makes the shared brand logo's width automatic when changing its height to help preserve its aspect ratio.

The inline viewer is within the request page; no separate tab is required for usual review.
Mobile PDF rendering depends on the installed browser. If a browser cannot embed PDFs,
**Open original** is available.

## Installation in PowerShell (Windows)

Back up your project folder first. Stop the current dev server (Ctrl+C).
Save the ZIP in Downloads, then:

```powershell
cd C:\e-lingkod-bayan
Expand-Archive -LiteralPath "$HOME\Downloads\e-lingkod-bayan-inline-document-preview-fix.zip" -DestinationPath "C:\e-lingkod-bayan" -Force
npm run dev
```

This patch **does not require** `npm install`, `npm run db:migrate`, `db:clear-data`, or reseeding users.
It does not delete existing documents or change any database tables.

## Verification checklist

1. Log in as Citizen, go to Online LGU Services > My Requests > open a request.
2. Upload or replace a JPG/PNG/WEBP requirement. The image should show below its filename after upload completes.
3. Upload a PDF requirement. An embedded PDF viewer should appear (browser support permitting).
4. Log in as Admin, open the same request and scroll to Requirements verification: preview should show inline.
5. Log in as assigned Staff or staff in the correct service office with SERVICES permission; preview should load without a 500.
6. Log in as an unrelated citizen or unauthorized staff; the document endpoint must deny access.
7. Try the **Open original** link to see the full file.

## Testing and limits

- Repository test suite: 156/156 passed (includes six new document-view and preview tests).
- No live database, browser-based end-to-end run, or complete Next.js production build in this isolated environment.
- This patch targets document uploads in **Online LGU Services**. Civic Reporting uses a separate existing photo-preview flow.

## Included files

- `src/app/api/services/documents/[documentId]/route.ts`
- `src/features/services/components/document-inline-preview.tsx` (new)
- `src/features/services/components/document-review-list.tsx`
- `src/features/services/components/citizen-request-detail.tsx`
- `src/app/layout.tsx`
- `src/components/shared/brand-logo.tsx`
- `tests/service-document-inline-preview.test.mjs` (new)
- `DOCUMENT-PREVIEW-FIX-README.md`
