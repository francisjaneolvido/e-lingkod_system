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
const { parseResolutionRemarks, parseResolutionVersion, parseResolutionDecision } = require("../src/features/civic/resolution-validation.ts");
const { REPORT_STATUSES, TRANSITIONS } = require("../src/features/civic/config.ts");
const { CivicError, checkTransition } = require("../src/features/civic/validation.ts");

test("pending verification is a distinct non-resolved status", () => {
  assert.ok(REPORT_STATUSES.includes("PENDING_VERIFICATION"));
  assert.deepEqual(TRANSITIONS.PENDING_VERIFICATION, []);
  assert.throws(() => checkTransition("IN_PROGRESS", "RESOLVED"), CivicError);
  assert.throws(() => checkTransition("PENDING_VERIFICATION", "RESOLVED"), CivicError);
});

test("resolution remark cannot be empty or superficial", () => {
  assert.equal(parseResolutionRemarks("  Streetlight replaced and inspected.  "), "Streetlight replaced and inspected.");
  assert.throws(() => parseResolutionRemarks("Fixed."), CivicError);
  assert.throws(() => parseResolutionRemarks("x".repeat(1501)), CivicError);
});

test("proof submission version is positive and must be a safe integer", () => {
  assert.equal(parseResolutionVersion("12"), 12);
  for (const item of ["", "1.5", "0", "-2", "unavailable", null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => parseResolutionVersion(item), CivicError);
});

test("only approve or return decisions with valid verification input", () => {
  const valid = { submissionId: "resolution-submission-123", version: 2, note: "Evidence visually verified" };
  assert.equal(parseResolutionDecision({ ...valid, decision: "APPROVE" }).decision, "APPROVE");
  assert.throws(() => parseResolutionDecision({ ...valid, decision: "RESOLVED" }), CivicError);
  assert.throws(() => parseResolutionDecision({ ...valid, decision: "RETURN", note: "redo" }), CivicError);
  assert.equal(parseResolutionDecision({ ...valid, decision: "RETURN", note: " Please include a clearer after photo. " }).note, "Please include a clearer after photo.");
});

test("resolution approval always requires a selected evidence submission", () => {
  assert.throws(() => parseResolutionDecision({ decision: "APPROVE", submissionId: "", version: 1 }), CivicError);
  assert.throws(() => parseResolutionDecision({ decision: "APPROVE", submissionId: "abc", version: 0 }), CivicError);
});
