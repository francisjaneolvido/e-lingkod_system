import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const script = path.resolve("scripts/repair-projects-prisma.mjs");
function fixture(schemaText) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "elb-projects-repair-test-"));
  fs.mkdirSync(path.join(folder, "prisma", "migrations", "20261023234000_municipal_projects_transparency_v2"), { recursive: true });
  fs.mkdirSync(path.join(folder, "prisma", "migrations", "20261024000000_municipal_projects_demo_media"), { recursive: true });
  fs.writeFileSync(path.join(folder, "prisma", "schema.prisma"), schemaText);
  for (const id of ["20261023234000_municipal_projects_transparency_v2", "20261024000000_municipal_projects_demo_media"]) {
    fs.writeFileSync(path.join(folder, "prisma", "migrations", id, "migration.sql"), "-- existing migration\n");
  }
  return folder;
}
// Use an independent V1 fixture so these tests pass both before and after the user applies the repair.
const original = `generator client {
  provider = "prisma-client"
  output = "../src/generated/prisma"
}
datasource db {
  provider = "mysql"
}
model JobOpportunity {
  id String @id
}
model CommunitySurvey {
  id String @id
}
model MunicipalProject {
  id String @id
  sourceUrl String @db.VarChar(500)
  status String @default("DRAFT")
}
model MunicipalProjectUpdate {
  id String @id
}
`;
const run = (cwd, arg) => spawnSync(process.execPath, [script, arg], { cwd, encoding: "utf8" });

test("Detect missing models without mutating project schema", () => {
  const cwd = fixture(original);
  const result = run(cwd, "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 V2 office directory models/);
  assert.equal(fs.readFileSync(path.join(cwd,"prisma/schema.prisma"),"utf8"),original);
});

test("Repair only Projects model; V2/V3 fields and office models consistent with existing migrations", () => {
  const cwd = fixture(original);
  const result = run(cwd, "--apply");
  assert.equal(result.status, 0, result.stderr);
  const after=fs.readFileSync(path.join(cwd,"prisma/schema.prisma"),"utf8");
  const outside = text => text.replace(/^model MunicipalProject \{[\s\S]*?^\}/m, "<PROJECT>")
   .replace(/\n\/\/ Municipal Projects V2 office contacts[\s\S]*$/m, "");
  assert.equal(outside(after).trimEnd(), outside(original).trimEnd(), "Non-project schema models modified!");
  for (const field of ["budgetPhp Decimal?", "budgetSourceUrl String?", "fundingSource String?", "contractor String?", "procurementUrl String?", "targetCompletion DateTime?", "isDemo Boolean", "photoPath String?"]) assert.ok(after.includes(field), field);
  assert.match(after,/sourceUrl String\? @db\.VarChar\(500\)/);
  assert.match(after,/model MunicipalOfficeDirectoryEntry \{/);
  assert.match(after,/model MunicipalOfficeDirectoryProposal \{/);
  assert.match(after,/@@map\("municipal_office_directory"\)/);
  assert.match(after,/@@map\("municipal_office_proposal"\)/);
  assert.equal(run(cwd, "--apply").status, 0);
  assert.equal(fs.readFileSync(path.join(cwd,"prisma/schema.prisma"),"utf8"),after, "Repeating script changed schema");
});

test("Refuses partially migrated schema without altering it", () => {
  const partial = original.replace("  sourceUrl String @db.VarChar(500)\n  status String @default(\"DRAFT\")", "  sourceUrl String @db.VarChar(500)\n  budgetPhp Decimal? @db.Decimal(16,2)\n  status String @default(\"DRAFT\")");
  assert.notEqual(partial,original);
  const cwd = fixture(partial);
  const result = run(cwd,"--apply");
  assert.equal(result.status,1);
  assert.match(result.stderr, /Partial or conflicting V2/);
  assert.equal(fs.readFileSync(path.join(cwd,"prisma/schema.prisma"),"utf8"),partial);
});
