/**
 * Municipal Projects V2 + V3 repair for the eLingkod Bayan archive.
 * Edit ONLY the MunicipalProject model and append missing Projects office models.
 * No DB access, migrations, client generation, or other-module schema changes.
 * Usage: node scripts/repair-projects-prisma.mjs --check | --apply
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
if (args.length !== 1 || !["--check", "--apply"].includes(args[0])) {
  console.error("Usage: node scripts/repair-projects-prisma.mjs --check | --apply");
  process.exit(2);
}
const apply = args[0] === "--apply";
const projectRoot = process.cwd();
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const v2Migration = path.join(projectRoot, "prisma", "migrations", "20261023234000_municipal_projects_transparency_v2", "migration.sql");
const v3Migration = path.join(projectRoot, "prisma", "migrations", "20261024000000_municipal_projects_demo_media", "migration.sql");

const directoryModels = `
// Municipal Projects V2 office contacts and proposed corrections; non-Projects models untouched.
model MunicipalOfficeDirectoryEntry {
  id String @id @default(cuid()) @db.VarChar(191)
  officeName String @unique @db.VarChar(160)
  phone String? @db.VarChar(35)
  extension String? @db.VarChar(15)
  email String? @db.VarChar(190)
  officeHours String? @db.VarChar(160)
  address String? @db.VarChar(220)
  notes String? @db.VarChar(350)
  sourceUrl String @db.VarChar(500)
  isPublished Boolean @default(true)
  verifiedAt DateTime
  verifiedById String @db.VarChar(191)
  updatedAt DateTime @updatedAt
  @@index([isPublished, officeName])
  @@map("municipal_office_directory")
}

model MunicipalOfficeDirectoryProposal {
  id String @id @default(cuid()) @db.VarChar(191)
  officeName String @db.VarChar(160)
  phone String? @db.VarChar(35)
  extension String? @db.VarChar(15)
  email String? @db.VarChar(190)
  officeHours String? @db.VarChar(160)
  address String? @db.VarChar(220)
  notes String? @db.VarChar(350)
  sourceUrl String @db.VarChar(500)
  status String @default("PENDING_REVIEW") @db.VarChar(25)
  reviewNote String? @db.VarChar(700)
  submittedById String @db.VarChar(191)
  reviewedById String? @db.VarChar(191)
  submittedAt DateTime @default(now())
  reviewedAt DateTime?
  @@index([status, submittedAt])
  @@map("municipal_office_proposal")
}
`;

function checkModel(source, name) {
  const matcher = new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, "m");
  const match = matcher.exec(source);
  return { match, body: match?.[1] ?? "" };
}

function expect(condition, message) { if (!condition) throw new Error(message); }

function repair(original) {
  let updated = original;
  const changes = [];
  const project = checkModel(updated, "MunicipalProject");
  expect(project.match, "Missing MunicipalProject model. Install Municipal Projects V1 before running this repair.");
  let body = project.body;
  const v2Fields = [
    "budgetPhp Decimal? @db.Decimal(16,2)",
    "budgetSourceUrl String? @db.VarChar(500)",
    "fundingSource String? @db.VarChar(180)",
    "contractor String? @db.VarChar(180)",
    "procurementUrl String? @db.VarChar(500)",
    "targetCompletion DateTime?",
  ];
  const fieldCount = v2Fields.filter(line => body.includes(line)).length;
  if (fieldCount !== 0 && fieldCount !== v2Fields.length) {
    throw new Error("Partial or conflicting V2 MunicipalProject fields; refusing automated edit. Review schema manually.");
  }
  if (!fieldCount) {
    expect(/^\s+sourceUrl String(?:\?)? @db\.VarChar\(500\)$/m.test(body), "Unexpected MunicipalProject sourceUrl field; refusing edit.");
    body = body.replace(/^(\s+sourceUrl String\?? @db\.VarChar\(500\))$/m, "$1\n  " + v2Fields.join("\n  "));
    changes.push("6 V2 project transparency fields");
  }
  const demoCount = ["isDemo Boolean @default(false)", "photoPath String? @db.VarChar(240)"].filter(x => body.includes(x)).length;
  if (demoCount === 1) throw new Error("Partial V3 demo fields; refusing automated edit. Review schema manually.");
  if (!demoCount) {
    expect(/^\s+sourceUrl String @db\.VarChar\(500\)$/m.test(body), "V3 needs an unmodified required sourceUrl field; refusing edit.");
    body = body.replace(/^(\s+)sourceUrl String @db\.VarChar\(500\)$/m,
      "$1sourceUrl String? @db.VarChar(500)\n$1isDemo Boolean @default(false)\n$1photoPath String? @db.VarChar(240)");
    changes.push("V3 demo flag, photo path and optional source URL");
  } else {
    expect(/^\s+sourceUrl String\? @db\.VarChar\(500\)$/m.test(body), "V3 sourceUrl does not match expected optional definition.");
  }
  updated = updated.slice(0, project.match.index) + project.match[0].replace(project.body, body) + updated.slice(project.match.index + project.match[0].length);
  const entry = checkModel(updated, "MunicipalOfficeDirectoryEntry");
  const proposal = checkModel(updated, "MunicipalOfficeDirectoryProposal");
  if (Boolean(entry.match) !== Boolean(proposal.match)) {
    throw new Error("Only one office directory model exists; refusing to add duplicates. Review schema manually.");
  }
  if (!entry.match) {
    updated = updated.trimEnd() + "\n" + directoryModels;
    changes.push("2 V2 office directory models");
  } else {
    for (const [name, model, table] of [
      ["MunicipalOfficeDirectoryEntry", entry, "municipal_office_directory"],
      ["MunicipalOfficeDirectoryProposal", proposal, "municipal_office_proposal"],
    ]) {
      expect(model.body.includes(`@@map("${table}")`), `Conflicting ${name} table mapping. Review manually.`);
    }
  }
  return { updated, changes };
}

try {
  for (const name of [v2Migration, v3Migration]) {
    expect(fs.existsSync(name), `Required existing migration missing: ${path.relative(projectRoot, name)}. Do not run migrate until resolved.`);
  }
  const original = fs.readFileSync(schemaPath, "utf8");
  const { updated, changes } = repair(original);
  const generated = path.join(projectRoot, "src", "generated", "prisma", "models");
  const models = ["MunicipalOfficeDirectoryEntry", "MunicipalOfficeDirectoryProposal"];
  const missingGenerated = models.filter(name => !fs.existsSync(path.join(generated, `${name}.ts`)));
  if (!apply) {
    console.log(changes.length ? `Schema needs: ${changes.join("; ")}` : "Municipal Projects V2/V3 schema already matches.");
    if (missingGenerated.length) console.log(`Generated Prisma Client is missing: ${missingGenerated.join(", ")}. Run npm run db:generate AFTER --apply.`);
    console.log("--check makes NO changes. Use --apply to update only the Projects models.");
  } else if (updated === original) {
    console.log("Already applied: no schema modifications.");
    console.log("Run npm run db:generate, then restart Next.js.");
  } else {
    const backup = path.join(os.tmpdir(), `elb-projects-schema-backup-${process.pid}-${Date.now()}.prisma`);
    fs.writeFileSync(backup, original, "utf8");
    const temp = `${schemaPath}.projects-${process.pid}.tmp`;
    try { fs.writeFileSync(temp, updated, "utf8"); fs.renameSync(temp, schemaPath); }
    catch (error) { try { fs.unlinkSync(temp); } catch {} throw error; }
    console.log(`Projects-only schema repair applied: ${changes.join("; ")}`);
    console.log(`Backup of ORIGINAL schema saved to: ${backup}`);
    console.log("Next: git diff -- prisma/schema.prisma; npm run db:migrate; npm run db:generate; npm run typecheck");
  }
} catch (error) {
  console.error(`Projects repair stopped safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
