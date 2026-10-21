import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = (path) => fs.readFileSync(path, "utf8");
const tile = read("src/features/landing/components/service-tile.tsx");
const services = read("src/features/landing/sections/services-section.tsx");
const modal = read("src/features/landing/components/service-detail-dialog.tsx");
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

test("Job Matching tile and heading navigate directly to live /opportunities", () => {
  assert.match(tile, /service\.id === "jobs" \? <Link href="\/opportunities"/);
  assert.match(tile, /Browse job opportunities/);
  assert.match(services, /if \(service\.id === "jobs"\) return <Link href="\/opportunities"/);
  assert.match(modal, /service\.id === "jobs" \? \(/);
});

test("service notices accurately distinguish working Job Matching from planned features", () => {
  assert.match(services, /Civic Reporting and Job Matching are available/);
  assert.doesNotMatch(services, /jobs, and census remain feature previews/);
  assert.match(tile, /Job discovery · Available/);
  assert.match(read("src/components/layout/site-footer.tsx"), /PESO job opportunities can also be browsed/);
});

test("citizen cards link to dedicated details instead of expanding into long inline content", () => {
  assert.match(browser, /href=\{`\/opportunities\/\$\{encodeURIComponent\(job\.id\)\}`\}/);
  assert.doesNotMatch(browser, /aria-expanded=\{selected/);
  assert.match(browser, /Filter by employment type/);
  assert.match(browser, /Filter by sector/);
  assert.match(browser, /Clear filters/);
});

test("job details are server-filtered: only published and non-expired", () => {
  assert.match(repo, /export async function publishedJobById/);
  assert.match(repo, /where: \{ id, status: "PUBLISHED", OR: \[\{ expiresAt: null \}, \{ expiresAt: \{ gte: new Date\(\) \} \}\] \}/);
  assert.match(detail, /if \(!job\) notFound\(\)/);
  assert.match(detail, /await connection\(\)/);
  assert.match(detail, /export const instant = false/);
  assert.match(read("src/app/opportunities/[id]/not-found.tsx"), /no longer available/);
  assert.match(repo, /select: \{/);
  const section = repo.slice(repo.indexOf("export async function publishedJobById"), repo.indexOf("export async function adminJobData"));
  assert.doesNotMatch(section, /reviewSource|reviewNote|reviewerId/);
});

test("job details include qualifications, contact steps and optional non-eligibility skill comparison", () => {
  assert.match(detail, /scoreMatch\(profile, job\)/);
  assert.match(detail, /EDUCATION_LABEL\[job\.education\]/);
  assert.match(detail, /job\.contactInfo/);
  assert.match(detail, /job\.skills\.map/);
  assert.match(detail, /not a qualification assessment/);
  assert.match(detail, /not an online job application or hiring decision/);
});

test("public job discovery does not require login; profile remains opt-in", () => {
  const listing = read("src/app/opportunities/page.tsx");
  assert.match(listing, /citizen \? profileForCitizen\(viewer\.id\) : Promise\.resolve\(null\)/);
  assert.match(listing, /publishedJobs\(\)/);
  assert.match(detail, /citizen \? await profileForCitizen\(viewer\.id\) : null/);
  assert.doesNotMatch(detail, /requirePageViewer/);
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
