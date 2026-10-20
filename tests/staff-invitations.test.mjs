import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import * as crypto from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "../src/lib/staff-invitations.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const MODULES = ["REPORTS", "SERVICES", "EMERGENCY", "PROJECTS", "JOBS", "CENSUS"];

function helpers(env = {}) {
  const module = { exports: {} };
  class CivicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
  const stub = name => {
    if (name === "server-only") return {};
    if (name === "node:crypto") return crypto;
    if (name === "@/features/civic/validation") return { CivicError };
    if (name === "@/lib/staff-modules") return { STAFF_MODULES: MODULES, isStaffModule: m => MODULES.includes(m) };
    throw new Error(`Unexpected import: ${name}`);
  };
  vm.runInNewContext("(function (require, module, exports, process) {" + compiled + "\n})", { URL })(stub, module, module.exports, { env: { NODE_ENV: "development", ...env } });
  return module.exports;
}

test("activation tokens use 32 random bytes and only their SHA-256 digest is stored", () => {
  const { invitationToken, hashInvitationToken, STAFF_INVITE_TOKEN_RE } = helpers();
  const first = invitationToken(), second = invitationToken();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.match(second, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.ok(STAFF_INVITE_TOKEN_RE.test(first));
  assert.match(hashInvitationToken(first), /^[0-9a-f]{64}$/);
  assert.equal(hashInvitationToken(first), crypto.createHash("sha256").update(first).digest("hex"));
});

test("invitations expire after 48 hours", () => {
  const before = Date.now();
  const { invitationExpiry } = helpers();
  const delta = invitationExpiry().getTime() - before;
  assert.ok(delta >= 48 * 3_600_000 - 1000 && delta <= 48 * 3_600_000 + 1000);
});

test("invitation input requires complete identity and valid permissions", () => {
  const { parseInvitationInput, validStaffModules } = helpers();
  const parsed = parseInvitationInput({ name: "  Juan   Dela Cruz ", email: "JUAN@EXAMPLE.COM", department: "  MDRRMO ", designation: "Response Officer", modules: ["REPORTS", "REPORTS"] });
  assert.equal(parsed.name, "Juan Dela Cruz");
  assert.equal(parsed.email, "juan@example.com");
  assert.equal(parsed.department, "MDRRMO");
  assert.equal(parsed.modules.length, 1);
  assert.throws(() => validStaffModules(["ADMIN"]));
  assert.throws(() => validStaffModules([]));
  assert.throws(() => parseInvitationInput({ name: "Test", email: "invalid", department: "Office", designation: "Officer", modules: ["REPORTS"] }));
});

test("password cannot be short, excessive, or contain control characters", () => {
  const { validateStaffPassword } = helpers();
  assert.throws(() => validateStaffPassword("short"));
  assert.throws(() => validateStaffPassword("a".repeat(129)));
  assert.throws(() => validateStaffPassword("a".repeat(12) + "\n"));
  assert.equal(validateStaffPassword("correct horse battery staple"), "correct horse battery staple");
});

test("manual link mode is opt-in and always disabled in production", () => {
  assert.equal(helpers({ STAFF_INVITE_DEMO_LINKS: "true" }).invitationDeliveryMode(), "DEMO");
  assert.equal(helpers({ STAFF_INVITE_DEMO_LINKS: "false" }).invitationDeliveryMode(), "DISABLED");
  assert.equal(helpers({ NODE_ENV: "production", STAFF_INVITE_DEMO_LINKS: "true" }).invitationDeliveryMode(), "DISABLED");
  assert.equal(helpers({ NODE_ENV: "production", RESEND_API_KEY: "key", STAFF_INVITE_FROM: "demo@example.com" }).invitationDeliveryMode(), "EMAIL");
});

test("production links require configured HTTPS origin", () => {
  const request = { url: "http://localhost:3000/api/admin/staff/invitations" };
  assert.throws(() => helpers({ NODE_ENV: "production" }).invitationUrl(request, "token"));
  assert.throws(() => helpers({ NODE_ENV: "production", BETTER_AUTH_URL: "http://example.com" }).invitationUrl(request, "token"));
  assert.equal(helpers({ NODE_ENV: "production", BETTER_AUTH_URL: "https://elb.example.org" }).invitationUrl(request, "secret"), "https://elb.example.org/staff/activate/secret");
});

test("Prisma invitation payload contains only actual database fields (regression for 503 error)", () => {
  const { parseInvitationInput, invitationDatabaseFields } = helpers();
  const input = parseInvitationInput({ name: "Ana Reyes", email: "ana@example.com", department: "MDRRMO", designation: "Officer", modules: ["REPORTS", "EMERGENCY"] });
  const fields = invitationDatabaseFields(input);
  assert.equal(Object.prototype.hasOwnProperty.call(fields, "modules"), false);
  assert.deepEqual(JSON.parse(fields.modulesJson), ["REPORTS", "EMERGENCY"]);
  assert.deepEqual(Object.keys(fields).sort(), ["department", "designation", "email", "modulesJson", "name"]);
});
