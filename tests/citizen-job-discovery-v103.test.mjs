import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServerTypescript } from "./helpers/load-typescript.mjs";

loadServerTypescript();
const { ServiceTile } = await import("../src/features/landing/components/service-tile.tsx");
const { ServiceDetailDialog } = await import("../src/features/landing/components/service-detail-dialog.tsx");
const { services: serviceDefinitions } = await import("../src/features/landing/data/services.ts");

const read = (path) => fs.readFileSync(path, "utf8");
const services = read("src/features/landing/sections/services-section.tsx");
const browser = read("src/features/jobs/components/opportunities-browser.tsx");
const detail = read("src/app/opportunities/[id]/page.tsx");
const repo = read("src/features/jobs/server/data.ts");

const updated = [
  "src/features/landing/components/service-tile.tsx",
  "src/features/landing/sections/services-section.tsx",
  "src/features/landing/components/service-detail-dialog.tsx",
  "src/features/landing/data/services.ts",
  "src/components/layout/site-footer.tsx",
  "src/features/jobs/components/opportunities-browser.tsx",
  "src/features/jobs/server/data.ts",
  "src/app/opportunities/page.tsx",
  "src/app/opportunities/[id]/page.tsx",
  "src/app/opportunities/[id]/not-found.tsx",
  "src/features/jobs/components/profile-editor.tsx",
];

test("Community Employment tile opens the live umbrella module and keeps opportunities available", () => {
  const service = serviceDefinitions.find(item => item.id === "jobs");
  const tile = renderToStaticMarkup(createElement(ServiceTile, { service, onExplore() {} }));
  const dialog = renderToStaticMarkup(createElement(ServiceDetailDialog, { service, onClose() {} }));
  assert.match(tile, /href="\/community-employment"/);
  assert.match(tile, /Profiling &amp; opportunities/);
  assert.match(services, /<ServiceTile\b/);
  assert.match(dialog, /href="\/community-employment"/);
  assert.match(dialog, /Published opportunities can be explored now/);
  assert.match(dialog, /do not submit applications/);
});

test("employment survey and future Census are clearly distinct in services notices", () => {
  const jobs = serviceDefinitions.find(item => item.id === "jobs");
  const census = serviceDefinitions.find(item => item.id === "census");
  const jobsTile = renderToStaticMarkup(createElement(ServiceTile, { service: jobs, onExplore() {} }));
  const censusDialog = renderToStaticMarkup(createElement(ServiceDetailDialog, { service: census, onClose() {} }));
  assert.match(jobsTile, /skills and training interests/);
  assert.match(censusDialog, /Public census statistics are not currently released/);
  assert.match(censusDialog, /Individual and establishment records remain protected/);
  assert.match(censusDialog, /Public and citizen census analytics remain unavailable/);
  assert.match(read("src/features/landing/data/services.ts"), /Community Employment & Livelihood/);
  assert.match(read("src/app/community-employment/page.tsx"), /Citizen Profiling/);
  assert.match(read("src/features/landing/data/services.ts"), /title: "Community Census", shortTitle: "Census · coming soon"/);
  assert.match(read("src/features/landing/data/services.ts"), /belongs to Job Matching \/ Employment & Livelihood, not Census/);
  assert.match(read("src/components/layout/site-footer.tsx"), /\/reports\/new/);
  assert.match(read("src/components/layout/site-footer.tsx"), /\/services/);
  assert.match(read("src/components/layout/site-footer.tsx"), /\/community-employment|\/opportunities/);
});

test("citizen cards link to dedicated details instead of expanding into long inline content", () => {
  assert.match(browser, /href=\{`\/opportunities\/\$\{encodeURIComponent\(job\.id\)\}`\}/);
  assert.doesNotMatch(browser, /aria-expanded=\{selected/);
  assert.match(browser, /Filter by employment type/);
  assert.match(browser, /Filter by sector/);
  assert.match(browser, /Clear filters/);
});

test("job details are server-filtered: only published and non-expired",()=>{
assert.match(repo,/export async function publishedJobById/);assert.match(repo,/status:'PUBLISHED'/);assert.match(repo,/employerVerified:true,vacancyVerified:true/);assert.match(repo,/expiresAt:\{gt:new Date\(\)\}/);assert.match(detail,/if\(!job\)notFound\(\)/);assert.match(detail,/await connection\(\)/);assert.match(detail,/instant=false/);assert.match(read('src/app/opportunities/[id]/not-found.tsx'),/no longer available/);const select=read('src/features/jobs/server/opportunities.ts').split('satisfies Prisma.JobOpportunitySelect')[0];assert.doesNotMatch(select,/reviewSource|reviewNote|reviewerId|createdById/);
});

test("job details include qualifications, contact steps and optional non-eligibility skill comparison",()=>{
assert.match(detail,/personalOpportunities\(viewer\)/);assert.match(detail,/personal\?\.matches.find/);assert.match(detail,/EDUCATION_LABEL\[job\.education\]/);assert.match(detail,/job\.contactInfo/);assert.match(detail,/job\.skills\.join/);assert.match(detail,/no hiring or eligibility guarantee/i);assert.match(detail,/does not forward your profile or process an application/);
});

test("public job discovery does not require login; profile remains opt-in",()=>{
const listing=read('src/app/opportunities/page.tsx');assert.match(listing,/publicOpportunities\(filters\)/);assert.match(listing,/viewer\?\.role==='CITIZEN'/);assert.match(listing,/personalOpportunities\(viewer\)/);assert.doesNotMatch(listing,/requirePageViewer|requireModulePage/);assert.doesNotMatch(detail,/requirePageViewer/);
});

test("opt-in skills profile has one persistent save button and enforces selection limits", () => {
  const source = read("src/features/jobs/components/profile-editor.tsx");
  assert.equal((source.match(/Save preferences<\/button>/g) || []).length, 0);
  assert.equal((source.match(/Save preferences/g) || []).length, 1);
  assert.match(source, /selected\.length >= max/);
  assert.match(source, /sticky bottom-0/);
  assert.match(source, /\/api\/jobs\/profile/);
});

test("all new or modified TypeScript/TSX files parse successfully", () => {
  for (const file of updated.filter(x => /\.tsx?$/.test(x))) {
    const output = ts.transpileModule(read(file), {
      fileName: file, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    });
    assert.equal(output.diagnostics?.length || 0, 0, `${file}: ${JSON.stringify(output.diagnostics?.map(e => e.messageText))}`);
  }
});
