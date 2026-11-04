import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const read = file => fs.readFileSync(file, "utf8");
const files = [
  "src/app/projects/page.tsx",
  "src/app/admin/projects/page.tsx",
  "src/features/projects/domain.ts",
  "src/features/projects/demo-assets.ts",
  "src/features/projects/components/project-console.tsx",
  "src/app/api/admin/projects/route.ts",
];
test("V3 project files parse without TS/TSX errors", () => {
  for (const path of files) {
    const output=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});
    assert.equal(output.diagnostics?.length||0,0,path);
  }
});
test("One missing office Prisma delegate does not stop the entire page", () => {
  const p=read("src/app/projects/page.tsx");
  assert.match(p,/Promise\.allSettled/);
  assert.match(p,/Promise\.resolve\(\)\.then\(\(\) => prisma\.municipalOfficeDirectoryEntry\.findMany\(\)\)/);
  assert.match(p,/console\.error\(`\[projects\] \$\{labels\[index\]\} query failed`, result.reason\)/);
});
test("Demo projects are explicitly fictional, cannot enter public financial totals, and are hidden in production", () => {
  const publicPage=read("src/app/projects/page.tsx");
  assert.match(publicPage,/FICTIONAL DEMO/);
  assert.match(publicPage,/!p\.isDemo && p\.budgetPhp !== null/);
  assert.match(publicPage,/p\.sourceUrl && !p\.isDemo/);
  assert.match(publicPage,/isDemo: false/);
  const api=read("src/app/api/admin/projects/route.ts");
  assert.match(api,/demoProjectInput/);
  assert.match(api,/process\.env\.NODE_ENV !== "production"/);
  assert.match(api,/reviewed\?\.isDemo/);
});
test("Seeder opt-in local, no overwrite, five drafts, non-destructive migration", () => {
  const seed=read("scripts/seed-projects-demo.mjs");
  assert.match(seed,/--confirm/);
  assert.match(seed,/PROJECTS_DEMO_MODE/);
  assert.match(seed,/\["localhost", "127\.0\.0\.1", "\[::1\]"\]/);
  assert.match(seed,/INSERT INTO municipal_project/);
  assert.match(seed,/'DRAFT'/);
  assert.doesNotMatch(seed,/TRUNCATE|DELETE FROM|DROP TABLE/);
  const sql=read("prisma/migrations/20261024000000_municipal_projects_demo_media/migration.sql");
  assert.match(sql,/ALTER TABLE `municipal_project`/);
  assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
  assert.doesNotMatch(sql,/ALTER TABLE `(?:job|community|census|spes)/i);
});
test("Demo images are bundled and restricted to known paths", () => {
  const assets=read("src/features/projects/demo-assets.ts");
  for(const filename of ["road-improvement","health-center","drainage","community-playground","streetlights"]){
    assert.match(assets,new RegExp(filename));
    assert.ok(fs.existsSync(`public/images/demo-projects/${filename}.webp`));
  }
  assert.match(assets,/DEMO_PROJECT_PHOTO_PATHS\.has\(input\)/);
});
