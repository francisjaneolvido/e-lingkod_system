import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const read = p => fs.readFileSync(p, "utf8");
const modified = [
  "src/features/projects/domain.ts", "src/features/projects/official-los-banos-offices.ts",
  "src/features/projects/components/project-console.tsx", "src/features/projects/components/office-directory-console.tsx",
  "src/app/projects/page.tsx", "src/app/admin/projects/page.tsx",
  "src/app/api/admin/projects/route.ts", "src/app/api/admin/projects/offices/route.ts"
];
test("Projects V2 TypeScript/TSX syntax and local imports", () => {
  for (const p of modified) {
    const src = read(p);
    const output = ts.transpileModule(src, {fileName:p, reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext}});
    assert.equal(output.diagnostics?.length ?? 0, 0, `Syntax issue in ${p}: ${JSON.stringify(output.diagnostics)}`);
    const file = ts.createSourceFile(p, src, ts.ScriptTarget.ESNext, true, p.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    for (const node of file.statements) if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith("@/")) {
      const dest = `src/${node.moduleSpecifier.text.slice(2)}`;
      assert.ok([`${dest}.ts`,`${dest}.tsx`,`${dest}/index.ts`,`${dest}/index.tsx`].some(fs.existsSync), `${p} missing ${dest}`);
    }
  }
});
test("Directory is grounded in official Los Baños LGU source, not US Los Banos", () => {
  const s=read("src/features/projects/official-los-banos-offices.ts");
  assert.match(s,/https:\/\/losbanos\.gov\.ph\/sendmail/);
  assert.match(s,/mpdo@losbanos\.gov\.ph/);
  assert.match(s,/\(049\) 530-2981/);
  assert.doesNotMatch(s,/\(209\) 827/);
  assert.match(s,/officeHours: null/);
});
test("Public directory shows only approved records and labels partial budget metrics", () => {
  const s=read("src/app/projects/page.tsx");
  assert.match(s,/status: "PUBLISHED"/);
  assert.match(s,/where: \{ status: "APPROVED" \}/);
  assert.match(s,/isPublished \? /);
  assert.match(s,/not total municipal expenditure/);
  assert.match(s,/budgetSourceUrl/);
  assert.match(s,/Published office contacts/);
});
test("Review-only directory proposals and Admin-published overrides", () => {
  const s=read("src/app/api/admin/projects/offices/route.ts");
  assert.match(s,/requireApiViewer\(request, "PROJECTS"\)/);
  assert.match(s,/assertSameOrigin\(request\)/);
  assert.match(s,/projectStaffMayEdit/);
  assert.match(s,/viewer\.role !== "ADMIN"/);
  assert.match(s,/status: "PENDING_REVIEW"/);
  assert.match(s,/tx\.municipalOfficeDirectoryEntry\.upsert/);
  assert.match(s,/"APPROVE" \? "APPROVED" : "RETURNED"/);
});
test("Project budget requires independent source and remains under Admin publication", () => {
  const d=read("src/features/projects/domain.ts");
  assert.match(d,/budgetSourceUrl/);
  assert.match(d,/official budget source URL is required/);
  const api=read("src/app/api/admin/projects/route.ts");
  assert.match(api,/projectDisclosure\(data\)/);
  assert.match(api,/admin\(viewer\.role\)/);
});
test("V2 migration is additive and does not alter Jobs, Survey, or Census tables", () => {
  const migration=read("prisma/migrations/20261023234000_municipal_projects_transparency_v2/migration.sql");
  assert.match(migration,/ALTER TABLE `municipal_project`/);
  assert.match(migration,/CREATE TABLE `municipal_office_directory`/);
  assert.match(migration,/CREATE TABLE `municipal_office_proposal`/);
  assert.doesNotMatch(migration,/\b(?:DROP|TRUNCATE|DELETE|UPDATE)\b/i);
  const tables=[...migration.matchAll(/(?:ALTER TABLE|CREATE TABLE) `([^`]+)`/g)].map(m=>m[1]);
  assert.deepEqual(tables,["municipal_project","municipal_office_directory","municipal_office_proposal"]);
});
