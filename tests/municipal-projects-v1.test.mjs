import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";
const read = path => readFileSync(path, "utf8");
const changed = [
  "src/features/projects/domain.ts", "src/features/projects/components/project-console.tsx",
  "src/app/projects/page.tsx", "src/app/admin/projects/page.tsx", "src/app/api/admin/projects/route.ts",
];
test("New municipal projects TS/TSX files parse", () => {
  for (const name of changed) {
    const output = ts.transpileModule(read(name), { fileName: name, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
    assert.equal(output.diagnostics?.length ?? 0, 0, `Parsing error in ${name}: ${JSON.stringify(output.diagnostics)}`);
  }
});
test("Projects have separate reviewed project and milestone models with an additive migration", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model MunicipalProject\s*\{/);
  assert.match(schema, /model MunicipalProjectUpdate\s*\{/);
  assert.match(schema, /phaseAfter String\?/);
  assert.ok(existsSync("prisma/migrations/20261023220000_municipal_projects_v1/migration.sql"));
  assert.doesNotMatch(read("prisma/migrations/20261023220000_municipal_projects_v1/migration.sql"), /\b(?:DROP|TRUNCATE|DELETE)\s+(?:TABLE|FROM|`)/i);
});
test("Project staff rights and approvals are enforced in the server route", () => {
  const src = read("src/app/api/admin/projects/route.ts");
  assert.match(src, /requireApiViewer\(request, "PROJECTS"\)/);
  assert.match(src, /staffCanManage\(viewer.role, viewer.department/);
  assert.match(src, /only the project author/i);
  assert.match(src, /admin\(viewer.role\)/);
  assert.match(src, /status: "PENDING_REVIEW"/);
  assert.match(src, /status: "PUBLISHED"/);
  assert.match(src, /decision === "APPROVE" \? "APPROVED"/);
  assert.match(src, /prisma\.\$transaction/);
});
test("Only reviewed projects and milestones are public", () => {
  const src = read("src/app/projects/page.tsx");
  assert.match(src, /status: "PUBLISHED"/);
  assert.match(src, /where: \{ status: "APPROVED" \}/);
  assert.match(src, /publishedServiceCatalog\(\)/);
  assert.match(src, /LGU_OFFICES/);
  assert.match(src, /No approved projects match the filters/);
});
test("Landing and staff navigation link to real module instead of placeholder", () => {
  assert.match(read("src/components/layout/site-header.tsx"), /directory: "\/projects"/);
  assert.match(read("src/components/admin/staff-workspace.tsx"), /PROJECTS: \{[^\n]+live: true/);
  assert.match(read("src/app/admin/page.tsx"), /href: "\/admin\/projects", icon: MapPinned, available: true/);
  assert.doesNotMatch(read("src/app/admin/[module]/page.tsx"), /projects: \{ index:/);
});
