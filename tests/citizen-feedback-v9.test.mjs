import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, file) => {
  const source = fs.readFileSync(file, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
};
const { parseCitizenFeedback } = require("../src/features/civic/citizen-feedback-validation.ts");
const { REPORT_STATUSES, TRANSITIONS } = require("../src/features/civic/config.ts");
const { checkTransition, CivicError } = require("../src/features/civic/validation.ts");
function form(decision = "DISPUTED", reason = "The streetlight is still out after repair.") {
  const f = new FormData(); f.set("decision", decision); f.set("submissionId", "resolution-submission-test-id"); f.set("version", "2");
  if (decision === "DISPUTED") f.set("reason", reason);
  return f;
}
test("reopening is a distinct triage state; ordinary resolution cannot bypass citizen feedback", () => {
  assert.ok(REPORT_STATUSES.includes("REOPENED"));
  assert.deepEqual(TRANSITIONS.RESOLVED, []);
  assert.deepEqual(TRANSITIONS.REOPENED, ["UNDER_REVIEW"]);
  assert.throws(() => checkTransition("RESOLVED", "UNDER_REVIEW"), CivicError);
});
test("citizen can confirm the latest verified resolution", () => {
  assert.deepEqual(parseCitizenFeedback(form("CONFIRMED")), {
    decision: "CONFIRMED", submissionId: "resolution-submission-test-id", version: 2, reason: null, photos: []
  });
});
test("a dispute requires explanatory reason", () => {
  assert.equal(parseCitizenFeedback(form()).decision, "DISPUTED");
  for (const reason of ["", "Still broken", "x".repeat(1501)]) assert.throws(() => parseCitizenFeedback(form("DISPUTED", reason)), CivicError);
});
test("feedback rejects version changes, missing submission and unsupported decisions", () => {
  const f = form(); f.set("version", "0"); assert.throws(() => parseCitizenFeedback(f), CivicError);
  const f2 = form(); f2.set("submissionId", ""); assert.throws(() => parseCitizenFeedback(f2), CivicError);
  const f3 = form(); f3.set("decision", "APPROVED"); assert.throws(() => parseCitizenFeedback(f3), CivicError);
});
test("confirmations cannot carry photos or text; disputes allow up to three photos", () => {
  const f = form("CONFIRMED"); f.append("photos", "fake"); assert.throws(() => parseCitizenFeedback(f), CivicError);
  const text = form("CONFIRMED"); text.set("reason", "Unexpected note"); assert.throws(() => parseCitizenFeedback(text), CivicError);
  const many = form(); for (let i=0; i<4; i++) many.append("photos", "image-placeholder"); assert.throws(() => parseCitizenFeedback(many), CivicError);
});
test("feedback security integration uses ownership, approved proof, unique response and version-checked writes", () => {
  const backend = fs.readFileSync("src/features/civic/server/citizen-feedback.ts", "utf8");
  assert.match(backend, /report\.reporterId !== viewer\.id/);
  assert.match(backend, /reviewStatus: "APPROVED"/);
  assert.match(backend, /citizenResolutionFeedback\.findUnique/);
  assert.match(backend, /version: input\.version, status: "RESOLVED", reporterId: viewer\.id/);
  assert.match(backend, /sharp\(buffer/);
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /resolutionSubmissionId String @unique/);
  const photo = fs.readFileSync("src/app/api/reports/feedback-photos/[photoId]/route.ts", "utf8");
  assert.match(photo, /reportAdminScope\(viewer\)/);
  assert.match(photo, /reporterId: viewer\.id/);
  assert.match(photo, /requireApiViewer/);
});
