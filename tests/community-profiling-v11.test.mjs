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
const insights = read("src/features/analytics/domain.ts");
const analyticalData = read("src/features/analytics/server/data.ts");
const censusPage = read("src/app/community-census/page.tsx");
const adminCensus = read("src/app/admin/census/page.tsx");

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

test("skills, training interests and barriers are collected and included in protected workforce analytics", () => {
  assert.match(domain, /COMMUNITY_SKILLS/);
  assert.match(domain, /TRAINING_PROGRAMS/);
  assert.match(domain, /TRAINING_BARRIERS/);
  assert.match(domain, /EMPLOYMENT_BARRIERS/);
  assert.match(survey, /TESDA-related/);
  assert.match(insights, /trainingPrograms/);
  assert.match(insights, /trainingBarriers/);
  assert.match(insights, /employmentBarriers/);
  assert.match(insights, /Training programs requested/);
  assert.match(insights, /Reported training barriers/);
  assert.match(insights, /Reported employment barriers/);
});

test("citizen survey and historical government activity imports stay separate at storage and analytics layers", () => {
  assert.match(schema, /model CommunitySurvey/);
  assert.match(schema, /model GovernmentActivity/);
  assert.match(schema, /model CommunityImportBatch/);
  assert.match(schema, /model CommunityImportRecord/);
  assert.match(analyticalData, /source observations/);
  assert.match(analyticalData, /groups=await imported/);
  assert.match(analyticalData, /groups=await spes/);
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

test("D08 public analytics fails closed without counts or filter metadata", () => {
  assert.match(data, /publicEmploymentInsights\(\) \{ throw new CivicError\("Public analytics release is unavailable/);
  const publicPage=read("src/app/community-employment/insights/page.tsx");
  const landing=read("src/app/community-employment/page.tsx");
  assert.doesNotMatch(publicPage, /publicEmploymentInsights|workforceAnalytics|EmploymentInsightsView/);
  assert.doesNotMatch(landing, /publicEmploymentInsights|data\.total|data\.employment/);
  assert.match(publicPage, /Public and citizen statistics are not currently released/);
  assert.match(read("src/app/api/admin/census/analytics/route.ts"), /requireApiViewer\(request,'CENSUS'\)/);
});

test("Public census remains private-data free while protected B3 records are separate", () => {
  assert.match(censusPage, /Public census statistics are not published here/);
  assert.match(censusPage, /No census records or census statistics are being displayed/);  assert.doesNotMatch(censusPage, /publicEmploymentInsights/);
  assert.doesNotMatch(adminCensus, /adminEmploymentInsights/);
});

test("opportunity recommendations can use the consented employment profile without submitting applications",()=>{
const page=read('src/app/opportunities/page.tsx');const service=read('src/features/jobs/server/recommendations.ts');assert.match(page,/personalOpportunities\(viewer\)/);assert.match(service,/consent\?\.matching/);assert.match(service,/status:\{in:\['SUBMITTED','WITHDRAWN'\]/);assert.match(service,/withdrawal/);assert.match(read('src/features/jobs/components/opportunity-workspace.tsx'),/does not send your profile or process applications/);
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
