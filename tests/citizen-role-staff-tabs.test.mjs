import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFileSync(path.join(root, relative), "utf8");

test("citizen-only server guards reject LGU accounts and redirect them out of citizen pages", () => {
  const access = read("src/lib/access.ts");
  assert.match(access, /requireCitizenApiViewer/);
  assert.match(access, /viewer\.role !== "CITIZEN"/);
  assert.match(access, /requireCitizenPageViewer/);
  assert.match(access, /redirect\("\/admin"\)/);
  for (const p of ["new/page.tsx", "page.tsx", "[id]/page.tsx"]) {
    assert.match(read(`src/app/(citizen)/reports/${p}`), /requireCitizenPageViewer/);
  }
});

test("submission and citizen feedback APIs both enforce citizen role server-side", () => {
  const submit = read("src/app/api/reports/route.ts");
  const detail = read("src/app/api/reports/[id]/route.ts");
  const feedback = read("src/app/api/reports/[id]/feedback/route.ts");
  assert.match(submit, /requireCitizenApiViewer\(request\)/);
  assert.match(detail, /requireCitizenApiViewer\(request\)/);
  assert.match(feedback, /requireCitizenApiViewer\(request\)/);
  assert.match(read("src/features/civic/server/mutations.ts"), /if \(viewer\.role !== "CITIZEN"\) throw new CivicError\("Only citizens can submit reports\.", 403\)/);
  assert.match(read("src/features/civic/server/citizen-feedback.ts"), /viewer\.role !== "CITIZEN"/);
});

test("LGU users may browse the public homepage but do not get the citizen-only report navigation", () => {
  const header = read("src/components/layout/site-header.tsx");
  assert.match(header, /const citizenPortal = viewer\?\.role === "CITIZEN"/);
  assert.match(header, /citizenPortal && <Link href="\/reports"/);
  assert.match(header, /staffPortal && service\.id === "civic" \? "\/admin"/);
  assert.match(read("src/features/landing/landing-page.tsx"), /lgu && <div role="note"/);
});

test("staff UI uses a clear directory / invitation / existing-account / history tab structure", () => {
  const tabs = read("src/components/admin/staff-management-workspace.tsx");
  for (const tab of ["directory", "invite", "assign", "activity"]) assert.match(tabs, new RegExp(`id: "${tab}"`));
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected=\{tab === item\.id\}/);
  assert.match(read("src/components/admin/staff-manager.tsx"), /Search staff/);
  assert.match(read("src/app/admin/staff/page.tsx"), /StaffManagementWorkspace/);
});
