/**
 * Non-destructive V2 schema patch.
 * Updates only model MunicipalProject and appends two PROJECTS-only models.
 * Other models, especially Jobs/Survey/Census, remain byte-for-byte untouched.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const path = resolve("prisma/schema.prisma");
let schema = readFileSync(path, "utf8");
const marker = "model MunicipalProject {";
const start = schema.indexOf(marker);
if (start === -1) throw new Error("Municipal Projects V1 schema missing. Apply V1 first.");
const end = schema.indexOf("\n}", start);
if (end === -1) throw new Error("Malformed MunicipalProject schema model.");
const project = schema.slice(start, end);
const fields = "  budgetPhp Decimal? @db.Decimal(16,2)\n  budgetSourceUrl String? @db.VarChar(500)\n  fundingSource String? @db.VarChar(180)\n  contractor String? @db.VarChar(180)\n  procurementUrl String? @db.VarChar(500)\n  targetCompletion DateTime?\n";
const key = "  sourceUrl String @db.VarChar(500)";
if (!project.includes("budgetPhp")) {
  if (!project.includes(key)) throw new Error("Unexpected MunicipalProject layout. Schema unchanged; merge manually.");
  schema = schema.slice(0,start) + project.replace(key, key + "\n" + fields.trimEnd()) + schema.slice(end);
} else if (!project.includes("targetCompletion DateTime?")) {
  throw new Error("Partial V2 MunicipalProject fields found; manual review required.");
}
const additions = "// PROJECTS module only. Other modules (Jobs, Survey and Census) are unchanged.\nmodel MunicipalOfficeDirectoryEntry {\n  id String @id @default(cuid()) @db.VarChar(191)\n  officeName String @unique @db.VarChar(160)\n  phone String? @db.VarChar(35)\n  extension String? @db.VarChar(15)\n  email String? @db.VarChar(190)\n  officeHours String? @db.VarChar(160)\n  address String? @db.VarChar(220)\n  notes String? @db.VarChar(350)\n  sourceUrl String @db.VarChar(500)\n  isPublished Boolean @default(true)\n  verifiedAt DateTime\n  verifiedById String @db.VarChar(191)\n  updatedAt DateTime @updatedAt\n  @@index([isPublished, officeName])\n  @@map(\"municipal_office_directory\")\n}\n\nmodel MunicipalOfficeDirectoryProposal {\n  id String @id @default(cuid()) @db.VarChar(191)\n  officeName String @db.VarChar(160)\n  phone String? @db.VarChar(35)\n  extension String? @db.VarChar(15)\n  email String? @db.VarChar(190)\n  officeHours String? @db.VarChar(160)\n  address String? @db.VarChar(220)\n  notes String? @db.VarChar(350)\n  sourceUrl String @db.VarChar(500)\n  status String @default(\"PENDING_REVIEW\") @db.VarChar(25)\n  reviewNote String? @db.VarChar(700)\n  submittedById String @db.VarChar(191)\n  reviewedById String? @db.VarChar(191)\n  submittedAt DateTime @default(now())\n  reviewedAt DateTime?\n  @@index([status, submittedAt])\n  @@map(\"municipal_office_proposal\")\n}\n";
for (const model of ["MunicipalOfficeDirectoryEntry", "MunicipalOfficeDirectoryProposal"]) {
  if (schema.includes(`model ${model} {`) && !schema.includes(`@@map("municipal_office_${model === "MunicipalOfficeDirectoryEntry" ? "directory" : "proposal"}")`)) {
    throw new Error(`Existing ${model} has an unexpected structure. Manual merge required.`);
  }
}
const begin = "// PROJECTS module only. Other modules (Jobs, Survey and Census) are unchanged.";
if (!schema.includes("model MunicipalOfficeDirectoryEntry {") && !schema.includes("model MunicipalOfficeDirectoryProposal {")) {
  schema += "\n" + additions.trim() + "\n";
} else if (!schema.includes("model MunicipalOfficeDirectoryEntry {") || !schema.includes("model MunicipalOfficeDirectoryProposal {")) {
  throw new Error("Partial V2 office models found; manual merge required.");
}
writeFileSync(path, schema);
console.log("Projects V2 schema integrated. Jobs, Survey and Census models were not edited.");
