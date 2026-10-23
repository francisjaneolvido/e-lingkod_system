import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = path => fs.readFileSync(path, "utf8");
const schema = read("prisma/schema.prisma");
const survey = read("src/features/community/components/community-survey-form.tsx");
const domain = read("src/features/community/domain.ts");
const data = read("src/features/community/server/data.ts");
const importer = read("src/features/community/components/community-import-workspace.tsx");
const importServer = read("src/features/community/server/import-file.ts");
const insights = read("src/features/community/components/employment-insights-view.tsx");
const censusPage = read("src/app/community-census/page.tsx");
const adminCensus = read("src/app/admin/census/page.tsx");
const opportunities = read("src/app/opportunities/page.tsx");

const files = [
  "src/features/community/domain.ts",
  "src/features/community/server/data.ts",
  "src/features/community/server/import-file.ts",
  "src/features/community/components/community-survey-form.tsx",
  "src/features/community/components/employment-insights-view.tsx",
  "src/features/community/components/community-admin-dashboard.tsx",
  "src/features/community/components/community-import-workspace.tsx",
  "src/features/community/components/manual-historical-record-form.tsx",
  "src/app/community-employment/page.tsx",
  "src/app/community-employment/insights/page.tsx",
  "src/app/community-survey/page.tsx",
  "src/app/community-census/page.tsx",
  "src/app/admin/jobs/insights/page.tsx",
  "src/app/admin/jobs/data/page.tsx",
  "src/app/admin/census/page.tsx",
  "src/app/api/community-survey/route.ts",
  "src/app/api/admin/community-import/inspect/route.ts",
  "src/app/api/admin/community-import/preview/route.ts",
  "src/app/api/admin/community-import/commit/route.ts",
  "src/app/api/admin/community-import/manual/route.ts",
  "src/app/api/admin/jobs/insights/export/route.ts",
];

test("Citizen Profiling is a survey for community planning, not a job application, and optional sections can be skipped", () => {
  assert.match(survey, /Citizen Profiling survey supports community planning/);
  assert.match(survey, /not a job application or a promise of employment/);
  assert.match(survey, /Skip optional section/);
  assert.match(survey, /Save draft/);
  assert.match(survey, /Only the basic profile, skills and consent are required/);
  assert.doesNotMatch(survey, /Submit application/i);
});

test("skills, training interests and barriers are collected and included in Job Matching analytics", () => {
  assert.match(domain, /COMMUNITY_SKILLS/);
  assert.match(domain, /TRAINING_PROGRAMS/);
  assert.match(domain, /TRAINING_BARRIERS/);
  assert.match(domain, /EMPLOYMENT_BARRIERS/);
  assert.match(survey, /TESDA-related/);
  assert.match(data, /trainingPrograms/);
  assert.match(data, /trainingBarriers/);
  assert.match(data, /employmentBarriers/);
  assert.match(insights, /Most requested training/);
  assert.match(insights, /Training barriers/);
  assert.match(insights, /Employment barriers/);
});

test("citizen survey and historical government activity imports stay separate at storage and analytics layers", () => {
  assert.match(schema, /model CommunitySurvey/);
  assert.match(schema, /model GovernmentActivity/);
  assert.match(schema, /model CommunityImportBatch/);
  assert.match(schema, /model CommunityImportRecord/);
  assert.match(data, /source: "CITIZEN_SURVEY"\|"HISTORICAL"/);
  assert.match(data, /intendedUse:"PUBLIC_AGGREGATED"/);
});

test("historical importer supports CSV and XLSX, mapping, validation and duplicate signals", () => {
  assert.match(importer, /CSV or XLSX/);
  assert.match(importer, /Map columns/);
  assert.match(importer, /Preview validation/);
  assert.match(importer, /Repeated refs/);
  assert.match(importServer, /lower\.endsWith\("\.csv"\)/);
  assert.match(importServer, /lower\.endsWith\("\.xlsx"\)/);
  assert.match(importServer, /normalizeImportedStatus/);
});

test("public employment insights use aggregate privacy controls and are explicitly not Census", () => {
  assert.match(data, /function suppress/);
  assert.match(data, /minimumPublicGroupSize:5/);
  assert.match(insights, /part of the Job Matching module/);
  assert.match(insights, /not the municipality&apos;s official census/);
  assert.match(insights, /public Job Matching insight breakdowns suppress categories with fewer than/);
});

test("Census stays a separate planned module with no employment survey analytics", () => {
  assert.match(censusPage, /The Census module has not been implemented yet/);
  assert.match(censusPage, /No census records or census statistics are being displayed/);
  assert.match(adminCensus, /intentionally empty for now/);
  assert.doesNotMatch(censusPage, /publicEmploymentInsights/);
  assert.doesNotMatch(adminCensus, /adminEmploymentInsights/);
});

test("opportunity recommendations can use the consented employment profile without submitting applications", () => {
  assert.match(opportunities, /communityMatchProfile/);
  assert.match(opportunities, /not an application or eligibility decision/);
  assert.match(opportunities, /Your profile is not sent to employers/);
});

test("Job Matching community profiling TypeScript and TSX sources parse", () => {
  for (const file of files) {
    const out = ts.transpileModule(read(file), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    assert.equal(out.diagnostics?.length ?? 0, 0, `${file}: ${JSON.stringify(out.diagnostics?.map(d => d.messageText))}`);
  }
});
