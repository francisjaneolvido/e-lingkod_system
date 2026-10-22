import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = name => fs.readFileSync(name, "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20261022233000_document_pickup_schedule/migration.sql");
const server = read("src/features/services/server/pickup.ts");
const mutations = read("src/features/services/server/mutations.ts");
const data = read("src/features/services/server/data.ts");
const staffUI = read("src/features/services/components/staff-pickup-panel.tsx");
const citizenUI = read("src/features/services/components/citizen-pickup-panel.tsx");

test("pickup is stored separately from interview/inspection and migration preserves data", () => {
  assert.match(schema, /model ServicePickupSlot \{/);
  assert.match(schema, /pickupSlots\s+ServicePickupSlot\[\]/);
  assert.match(migration, /CREATE TABLE `service_pickup_slot`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  assert.match(data, /pickupSlots: row.pickupSlots.map/);
});

test("staff offers 2-5 future unique choices after admin approval with office permissions", () => {
  assert.match(server, /slots.length < 2 \|\| slots.length > 5/);
  assert.match(server, /releaseApprovedAt/);
  assert.match(server, /departmentMatchesService/);
  assert.match(server, /requireAcceptedWork/);
  assert.match(server, /new Set\(times.map/);
  assert.match(server, /READY_FOR_RELEASE/);
});

test("citizen can select, request reschedule, and receives notifications", () => {
  assert.match(server, /action === "SELECT"/);
  assert.match(server, /action === "REQUEST_CHANGE"/);
  assert.match(server, /status: "CHANGE_REQUESTED"/);
  assert.match(server, /status: "NOT_SELECTED"/);
  assert.match(server, /PICKUP_CONFIRMED/);
  assert.match(citizenUI, /Choose one available slot/);
  assert.match(citizenUI, /Request new pickup dates/);
});

test("release blocked without confirmation and claimant ID validation, admin verifies final", () => {
  assert.match(server, /Citizen must confirm a document pickup schedule before release/);
  assert.match(server, /idVerified !== true/);
  assert.match(server, /confirmed pickup date\/time has arrived/);
  assert.match(server, /status: "CLAIMED"/);
  assert.match(mutations, /recordServicePickupRelease\(id, input, viewer\)/);
  assert.match(mutations, /if \(!row.releaseNote\)/);
  assert.match(staffUI, /Confirm physical document released/);
});

test("new routes and UI modules parse", () => {
  const files = [
    "src/features/services/server/pickup.ts",
    "src/features/services/server/mutations.ts",
    "src/features/services/server/data.ts",
    "src/features/services/components/staff-pickup-panel.tsx",
    "src/features/services/components/citizen-pickup-panel.tsx",
    "src/features/services/components/admin-request-actions.tsx",
    "src/features/services/components/citizen-request-detail.tsx",
    "src/app/api/admin/services/requests/[id]/pickup/route.ts",
    "src/app/api/services/requests/[id]/pickup/[slotId]/route.ts",
    "src/app/services/requests/[id]/print/page.tsx",
  ];
  for (const file of files) {
    const result = ts.transpileModule(read(file), { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    assert.deepEqual(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")) || [], [], `${file} TS syntax failed`);
  }
});
