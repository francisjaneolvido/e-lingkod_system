# Civic GPS and Evidence Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance existing civic reports with automatic editable location and server-enforced category relevant photo evidence, visible to the admin desk.

**Architecture:** Extend the current report form, Next.js API handlers, Prisma models and authenticated repository. OpenAI vision runs server side at preview and again during final submission. Saved coordinates power the staff map.

**Tech Stack:** Next.js 16, React 19, Prisma 7, MySQL, sharp, OpenAI Responses HTTP API, OpenStreetMap.

**Spec:** `docs/superpowers/specs/2026-11-13-civic-gps-image-validation-design.md`

## Global Constraints

Keep the existing civic reporting, staff scope, authentication, design and report workflow. Fail closed on AI errors. No fake GPS or AI results. Never expose API keys to the browser. No external changes or push.

## Review Focus

Category switches after photo preview must invalidate preview. A forged client result must not bypass server validation. AI service failure must not save a report. Manual coordinates must not be labeled GPS. Staff map data must respect reportAdminScope.

---

### Task 1: Model and AI policy

**Files:** `prisma/schema.prisma`, `prisma/migrations/*/migration.sql`, `src/features/civic/server/evidence.ts`, `src/features/civic/evidence-policy.ts`, `tests/civic-evidence.test.mjs`, `.env.example`.

**Interfaces:** `analyzeEvidence(image: Uint8Array, category: ReportCategory, title: string, description: string): Promise<EvidenceResult>`; result has status, score, observations, feedback, validatedAt.

- [ ] Write tests for category mapping, structured responses, uncertain/rejected outcomes, and service errors.
- [ ] Run tests to observe missing behavior.
- [ ] Add migration, policy and server OpenAI adapter; validate model output and fail closed.
- [ ] Run tests and Prisma validation.

### Task 2: Submission and preview

**Files:** `src/features/civic/server/mutations.ts`, `src/app/api/reports/evidence/route.ts`, `src/features/civic/components/photo-uploader.tsx`, `src/features/civic/components/report-form.tsx`.

**Interfaces:** Preview receives authenticated multipart category/title/description/photos; submission calls analyzeEvidence for each normalized photo, saves successful results with each photo.

- [ ] Write/extend tests covering server bypass and per-photo decisions.
- [ ] Run failing tests.
- [ ] Add preview and final validation, feedback and category reset.
- [ ] Run tests and typecheck.

### Task 3: Location and admin map

**Files:** `src/features/civic/components/location-picker.tsx`, `src/features/civic/components/report-form.tsx`, `src/app/api/reports/reverse-geocode/route.ts`, `src/features/civic/validation.ts`, `src/features/civic/server/repository.ts`, `src/features/civic/types.ts`, `src/features/civic/components/report-detail.tsx`, `src/app/admin/reports/page.tsx`, `src/components/admin/admin-report-map.tsx`.

**Interfaces:** Persist `locationCapturedAt`; reverse geocode bounded validated coordinates; admin map receives scoped summaries with actual saved coordinates.

- [ ] Add tests for location timestamp/source parsing and map data scope.
- [ ] Run failing tests.
- [ ] Implement automatic capture, editable map/location, address lookup, and staff marker/filter display.
- [ ] Run tests, lint, typecheck and build as environment permits.
