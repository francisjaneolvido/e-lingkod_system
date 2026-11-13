import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, file) => {
  const source = fs.readFileSync(file, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
};
const { chooseGpsReading, gpsErrorMessage, GPS_TARGET_ACCURACY_METERS } = load("../src/features/civic/gps-selection.ts");
const empty = { latitude: "", longitude: "", accuracy: null, source: "ADDRESS", capturedAt: null };
const timestamp = Date.UTC(2026, 10, 14, 8, 0, 0);
const fix = (latitude = 14.1691234, longitude = 121.2416123, accuracy = 40) => ({ latitude, longitude, accuracy });

test("GPS populates exact valid coordinates, reported accuracy, and timestamp", () => {
  const value = chooseGpsReading(empty, fix(), timestamp);
  assert.deepEqual(value, { latitude: "14.1691234", longitude: "121.2416123", accuracy: 40, source: "GPS", capturedAt: "2026-11-14T08:00:00.000Z" });
});
test("subsequent GPS readings only replace the current fix when accuracy improves", () => {
  const first = chooseGpsReading(empty, fix(), timestamp);
  assert.equal(chooseGpsReading(first, fix(14.18, 121.25, 90), timestamp + 1000), null);
  assert.equal(chooseGpsReading(first, fix(14.18, 121.25, 40), timestamp + 1000), null);
  assert.equal(chooseGpsReading(first, fix(14.18, 121.25, 12), timestamp + 2000).accuracy, 12);
});
test("a manual incident pin cannot be overwritten by background GPS", () => {
  const manual = { latitude: "14.2000000", longitude: "121.2000000", accuracy: null, source: "MANUAL", capturedAt: null };
  assert.equal(chooseGpsReading(manual, fix(14.1, 121.1, 2), timestamp), null);
  assert.equal(chooseGpsReading(manual, fix(14.1, 121.1, 2), timestamp, true).source, "GPS");
});
test("invalid, spoofed, or extreme GPS readings are ignored", () => {
  for (const reading of [fix(91, 121, 10), fix(-91, 121, 10), fix(14, 181, 10), fix(14, -181, 10),
    fix(NaN, 121, 10), fix(14, Infinity, 10), fix(14, 121, -1), fix(14, 121, Infinity), fix(14, 121, 1_000_001)]) {
    assert.equal(chooseGpsReading(empty, reading, timestamp), null);
  }
});
test("GPS at coordinate zero is legitimate and accuracy can be fractional", () => {
  assert.deepEqual(chooseGpsReading(empty, fix(0, 0, 4.63), timestamp).accuracy, 4.6);
  assert.equal(chooseGpsReading(empty, fix(0, 0, 4.63), timestamp).latitude, "0.0000000");
});
test("invalid timestamps are never reported as real capture times", () => {
  assert.equal(chooseGpsReading(empty, fix(), Number.NaN).capturedAt, null);
  assert.equal(chooseGpsReading(empty, fix(), Infinity).capturedAt, null);
});
test("permission, timeout and unavailable GPS errors have manual fallbacks", () => {
  assert.match(gpsErrorMessage(1), /permission was denied/);
  assert.match(gpsErrorMessage(3), /timed out/);
  assert.match(gpsErrorMessage(2), /unavailable/);
  assert.equal(GPS_TARGET_ACCURACY_METERS, 15);
});
test("location picker retains auto-request, high-accuracy watch, manual map, reverse-geocoding and cleanup", () => {
  const source = fs.readFileSync(new URL("../src/features/civic/components/location-picker.tsx", import.meta.url), "utf8");
  assert.match(source, /geolocation\.watchPosition\(/);
  assert.match(source, /enableHighAccuracy:\s*true/);
  assert.match(source, /maximumAge:\s*0/);
  assert.match(source, /setTimeout\(\(\) => locate\(false\), 0\)/);
  assert.match(source, /clearWatch\(/);
  assert.match(source, /chooseGpsReading\(/);
  assert.match(source, /<InteractiveMap[^>]+onSelect=\{select\}/);
  assert.match(source, /reverse-geocode\?lat=/);
  assert.match(source, /locationGeneration\.current \+= 1/);
  assert.match(source, /addressWasEdited/);
});
test("existing category-aware AI validation executes before the report is saved", () => {
  const mutation = fs.readFileSync(new URL("../src/features/civic/server/mutations.ts", import.meta.url), "utf8");
  const evidence = fs.readFileSync(new URL("../src/features/civic/server/evidence.ts", import.meta.url), "utf8");
  assert.match(mutation, /preparePhotos\(form\)/);
  assert.match(mutation, /analyzeEvidence\(photo\.data, fields\.category, fields\.title, fields\.description\)/);
  assert.ok(mutation.indexOf("analyzeEvidence(photo.data, fields.category") < mutation.indexOf("prisma.civicReport.create"));
  assert.match(mutation, /result\.status !== "ACCEPTED"/);
  assert.match(evidence, /import "server-only"/);
  assert.match(evidence, /process\.env\.OPENAI_API_KEY/);
  assert.match(evidence, /omni-moderation-latest/);
  assert.match(evidence, /parseEvidenceResponse/);
  assert.match(evidence, /new CivicError\("We couldn't verify the photo right now\./);
});

test("existing report persistence and authorized report detail use the saved GPS values", () => {
  const schema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const repository = fs.readFileSync(new URL("../src/features/civic/server/repository.ts", import.meta.url), "utf8");
  const detail = fs.readFileSync(new URL("../src/features/civic/components/report-detail.tsx", import.meta.url), "utf8");
  assert.match(schema, /latitude\s+Float\?/);
  assert.match(schema, /longitude\s+Float\?/);
  assert.match(schema, /gpsAccuracy\s+Float\?/);
  assert.match(repository, /latitude:\s*row\.latitude/);
  assert.match(repository, /longitude:\s*row\.longitude/);
  assert.match(repository, /gpsAccuracy:\s*row\.gpsAccuracy/);
  assert.match(detail, /report\.latitude/);
  assert.match(detail, /report\.longitude/);
});
