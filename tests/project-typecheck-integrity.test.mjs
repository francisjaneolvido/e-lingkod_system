import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/features/services/components/staff-pickup-panel.tsx",
  "src/features/services/components/citizen-pickup-panel.tsx",
  "src/features/services/components/document-inline-preview.tsx",
  "src/components/admin/lgu-office-select.tsx",
  "src/features/services/server/pickup.ts",
];

test("service pickup, document preview and LGU picker imports resolve", () => {
  for (const file of files) assert.ok(existsSync(join(root, file)), `${file} must be present`);
});

test("V11 profile schema includes migrated lifecycle and consent tables", () => {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  for (const model of ["CommunitySurveyWorkspace", "CommunitySurveyRevision", "CitizenProfileConsent"]) {
    assert.match(schema, new RegExp(`model ${model}\\s*\\{`), `${model} must be in Prisma schema`);
  }
  for (const field of ["employmentHistory", "overseasExperience", "qualificationsJson", "completedTrainingJson"]) {
    assert.match(schema, new RegExp(`\\b${field}\\s+`), `${field} must be in CommunitySurvey`);
  }
  assert.ok(existsSync(join(root, "prisma/migrations/20261023030000_citizen_profile_history/migration.sql")), "existing schema migration must be present");
});
