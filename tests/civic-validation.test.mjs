import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const loadModule = createRequire(import.meta.url);
// Compile the small, framework-independent validation modules in this test process.
loadModule.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { parseReportForm, parseAdminUpdate, checkTransition, CivicError } = loadModule("../src/features/civic/validation.ts");
const { REPORT_STATUSES, TRACKING_PATTERN } = loadModule("../src/features/civic/config.ts");
function validForm() {
  const form = new FormData();
  Object.entries({ category: "STREETLIGHTS", submissionKey: "d8fe6200-341d-4a3e-89b1-27c4b92e641f", title: "Broken streetlight near the hall", description: "The streetlight near the barangay hall has been unlit for three evenings.", barangay: "Test area", address: "Along the road beside the test hall", latitude: "", longitude: "", locationSource: "ADDRESS", confirmed: "true" }).forEach(([key, value]) => form.set(key, value));
  return form;
}
test("address-only reports never invent GPS coordinates", () => {
  const result = parseReportForm(validForm());
  assert.equal(result.latitude, null); assert.equal(result.longitude, null);
  assert.equal(result.locationSource, "ADDRESS"); assert.equal(result.gpsAccuracy, null);
});
test("valid coordinates at zero are preserved, with GPS accuracy", () => {
  const form = validForm(); form.set("latitude", "0"); form.set("longitude", "0"); form.set("gpsAccuracy", "15"); form.set("locationSource", "GPS");
  const result = parseReportForm(form); assert.equal(result.latitude, 0); assert.equal(result.longitude, 0); assert.equal(result.gpsAccuracy, 15);
});
test("partial or out-of-range coordinates are rejected", () => {
  for (const [latitude, longitude] of [["14", ""], ["", "120"], ["91", "120"], ["14", "181"], ["NaN", "120"]]) {
    const form = validForm(); form.set("latitude", latitude); form.set("longitude", longitude);
    assert.throws(() => parseReportForm(form), CivicError);
  }
});
test("GPS cannot be claimed without coordinates and an accuracy reading", () => {
  const form = validForm(); form.set("locationSource", "GPS"); assert.throws(() => parseReportForm(form), CivicError);
  form.set("latitude", "14.5"); form.set("longitude", "120.8"); assert.throws(() => parseReportForm(form), CivicError);
});
test("unsupported categories, missing consent, and client-key spoofing are rejected", () => {
  for (const [field, value] of [["category", "ADMIN"], ["confirmed", "false"], ["submissionKey", "duplicate"], ["title", "   "], ["description", "too short"]]) {
    const form = validForm(); form.set(field, value); assert.throws(() => parseReportForm(form), CivicError);
  }
});
test("active and resolved concerns need a responsible office", () => {
  for (const status of ["IN_PROGRESS", "RESOLVED"]) assert.throws(() => parseAdminUpdate({ status, assignedOffice: "", note: "A meaningful progress update.", version: 1 }), CivicError);
  assert.equal(parseAdminUpdate({ status: "IN_PROGRESS", assignedOffice: " Engineering ", note: "Staff are checking the reported light.", version: 2 }).assignedOffice, "Engineering");
});
test("status transitions require review and support explicit reopening", () => {
  assert.doesNotThrow(() => checkTransition("SUBMITTED", "UNDER_REVIEW"));
  assert.doesNotThrow(() => checkTransition("UNDER_REVIEW", "IN_PROGRESS"));
  assert.doesNotThrow(() => checkTransition("IN_PROGRESS", "PENDING_VERIFICATION"));
  assert.throws(() => checkTransition("RESOLVED", "UNDER_REVIEW"), CivicError);
  assert.doesNotThrow(() => checkTransition("REOPENED", "UNDER_REVIEW"));
  assert.throws(() => checkTransition("REOPENED", "IN_PROGRESS"), CivicError);
  assert.throws(() => checkTransition("IN_PROGRESS", "RESOLVED"), CivicError);
  assert.throws(() => checkTransition("PENDING_VERIFICATION", "RESOLVED"), CivicError);
  assert.doesNotThrow(() => checkTransition("REJECTED", "UNDER_REVIEW"));
  assert.throws(() => checkTransition("SUBMITTED", "RESOLVED"), error => error.status === 409);
  assert.throws(() => checkTransition("REJECTED", "IN_PROGRESS"), error => error.status === 409);
  for (const status of REPORT_STATUSES) assert.doesNotThrow(() => checkTransition(status, status));
});
test("updates require explanatory remarks and a positive integer version", () => {
  for (const version of [0, -1, 1.5, "1", null]) assert.throws(() => parseAdminUpdate({ status: "UNDER_REVIEW", note: "Staff are validating the concern.", version }), CivicError);
  assert.throws(() => parseAdminUpdate({ status: "REJECTED", note: "No", version: 1 }), CivicError);
  assert.throws(() => parseAdminUpdate({ status: "INVALID", note: "Staff are validating the concern.", version: 1 }), CivicError);
});
test("sample demo IDs never pass the saved tracking ID format", () => {
  assert.equal(TRACKING_PATTERN.test("ELB-DEMO-001"), false);
  assert.equal(TRACKING_PATTERN.test("ELB-2026-A1B2C3D4E5F6"), true);
});
test("case update validation accepts approved priority and assignment fields", () => {
  const item = parseAdminUpdate({ status: "UNDER_REVIEW", assignedOffice: " MDRRMO ", assignedStaffId: "staff-001", priority: "URGENT", visibleToCitizen: false, note: "Route the concern for field verification.", version: 4 });
  assert.equal(item.priority, "URGENT");
  assert.equal(item.assignedStaffId, "staff-001");
  assert.equal(item.assignedOffice, "MDRRMO");
  assert.equal(item.visibleToCitizen, false);
});
test("invalid priorities, staff IDs, and visibility flags are rejected", () => {
  const base = { status: "UNDER_REVIEW", assignedOffice: "MDRRMO", note: "Visit the reported location tomorrow.", version: 2 };
  for (const field of [{ priority: "CRITICAL" }, { assignedStaffId: 42 }, { assignedStaffId: "x".repeat(192) }, { visibleToCitizen: "yes" }]) {
    assert.throws(() => parseAdminUpdate({ ...base, ...field }), CivicError);
  }
});
