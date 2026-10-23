import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("src/features/community/domain.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const output = { exports: {} };
class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`)((name) => {
  if (name === "@/features/civic/validation") return { CivicError };
  throw new Error(`Unexpected dependency: ${name}`);
}, output, output.exports);
const { parseCommunitySurvey } = output.exports;
const year = new Date().getFullYear();
const submitted = { surveyYear: year, status: "SUBMITTED", barangay: "Batong Malake", ageGroup: "18-24", educationLevel: "SENIOR_HIGH", employmentStatus: "STUDENT", skills: ["Data Entry"], consentAggregated: true, consentOpportunityRecommendations: false };

test("an incomplete draft can be saved before core questions and skills are answered", () => {
  const result = parseCommunitySurvey({ surveyYear: year, status: "DRAFT", barangay: "Batong Malake" });
  assert.equal(result.status, "DRAFT");
  assert.equal(result.barangay, "Batong Malake");
  assert.equal(result.skills.length, 0);
});

test("submission still requires complete core answers and aggregate consent, not optional matching", () => {
  assert.throws(() => parseCommunitySurvey({ ...submitted, ageGroup: "" }), CivicError);
  assert.throws(() => parseCommunitySurvey({ ...submitted, consentAggregated: false }), CivicError);
  const result = parseCommunitySurvey(submitted);
  assert.equal(result.consentOpportunityRecommendations, false);
  assert.equal(result.employmentStatus, "STUDENT");
});

test("drafts validate supplied categories and do not accept a forged status", () => {
  assert.throws(() => parseCommunitySurvey({ ...submitted, status: "DRAFT", ageGroup: "invalid" }), CivicError);
  assert.throws(() => parseCommunitySurvey({ ...submitted, status: "APPROVED" }), CivicError);
});

test("student submissions use the approved adult respondent group", () => {
  assert.throws(() => parseCommunitySurvey({ ...submitted, ageGroup: "15-17" }), CivicError);
  assert.equal(parseCommunitySurvey({ ...submitted, ageGroup: "18-24" }).employmentStatus, "STUDENT");
});

test("false-like strings cannot silently grant matching or aggregate consent", () => {
  assert.throws(() => parseCommunitySurvey({ ...submitted, consentOpportunityRecommendations: "false" }), CivicError);
  assert.throws(() => parseCommunitySurvey({ ...submitted, consentAggregated: "true" }), CivicError);
});

test("invalid household numbers are rejected rather than fabricated or clamped", () => {
  for (const householdSize of ["unknown", -1, 1.5, 31]) {
    assert.throws(() => parseCommunitySurvey({ ...submitted, householdSize }), CivicError);
  }
});

test("skills must be actual text values and cannot hide malformed payloads", () => {
  for (const skills of [42, [{ label: "Data Entry" }], ["a".repeat(81)]]) {
    assert.throws(() => parseCommunitySurvey({ ...submitted, skills }), CivicError);
  }
});

test("invalid and out-of-range years do not fall back to the current year", () => {
  for (const surveyYear of [0, 2019, year + 2, 2026.5]) {
    assert.throws(() => parseCommunitySurvey({ ...submitted, surveyYear }), CivicError);
  }
});

test("employment history, acquired qualifications and overseas experience survive normalization", () => {
  const result = parseCommunitySurvey({ ...submitted, employmentHistory: "Retail assistant, 2022–2024", overseasExperience: "FORMER", qualifications: ["TESDA NC II"], completedTraining: ["Bookkeeping"] });
  assert.equal(result.employmentHistory, "Retail assistant, 2022–2024");
  assert.equal(result.overseasExperience, "FORMER");
  assert.deepEqual(Array.from(result.qualifications), ["TESDA NC II"]);
  assert.deepEqual(Array.from(result.completedTraining), ["Bookkeeping"]);
});
