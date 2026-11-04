/** Idempotent additive schema edit for the Municipal Projects module only. */
import fs from "node:fs";
import path from "node:path";
const file = path.resolve("prisma/schema.prisma");
const before = fs.readFileSync(file, "utf8");
const start = before.indexOf("model MunicipalProject {");
const end = before.indexOf("\n}", start);
if (start === -1 || end === -1) throw new Error("MunicipalProject Prisma model missing. Apply V1/V2 first.");
const section = before.slice(start, end);
if (!section.includes("budgetPhp Decimal?") || !before.includes("model MunicipalOfficeDirectoryEntry")) {
  throw new Error("Municipal Projects V2 schema is required. Run apply-projects-v2-schema.mjs first.");
}
if (section.includes("isDemo ") || section.includes("photoPath ")) {
  if (section.includes("isDemo Boolean @default(false)") && section.includes("photoPath String? @db.VarChar(240)") && section.includes("sourceUrl String? @db.VarChar(500)")) {
    console.log("Municipal Projects demo schema already applied; no changes.");
    process.exit(0);
  }
  throw new Error("Existing Municipal Projects V3 fields differ. Review manually before migration.");
}
if (!section.includes("sourceUrl String @db.VarChar(500)")) throw new Error("Unexpected project sourceUrl definition; do not modify automatically.");
const modified = section
  .replace("sourceUrl String @db.VarChar(500)", "sourceUrl String? @db.VarChar(500)\n  isDemo Boolean @default(false)\n  photoPath String? @db.VarChar(240)");
const after = before.slice(0, start) + modified + before.slice(end);
fs.writeFileSync(file, after, "utf8");
console.log("Added demo/photo fields to MunicipalProject model only. Review git diff -- prisma/schema.prisma");
