/** Explicit opt-in local-only Municipal Projects demonstration draft seeder. */
import "dotenv/config";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve("@prisma/adapter-mariadb"));
const { createConnection } = adapterRequire("mariadb");

const examples = [
  ["demo-elb-road-v3", "DEMO: Barangay road improvement", "Fictional example of improving a local access road and drainage for pedestrians and commuters. Not a real Los Baños government project.", "Infrastructure", "ONGOING", "Municipal Engineering Office (MEO)", "Bayog", "/images/demo-projects/road-improvement.webp"],
  ["demo-elb-health-v3", "DEMO: Community health facility", "Fictional example of improving a community health consultation facility. No actual construction or funding is implied.", "Health", "PLANNED", "Municipal Health Office (MHO)", "Batong Malake", "/images/demo-projects/health-center.webp"],
  ["demo-elb-drainage-v3", "DEMO: Drainage improvement", "Fictional example of neighborhood drainage maintenance and flood-risk reduction. This is not an official flood-control project announcement.", "Infrastructure", "ONGOING", "Municipal Engineering Office (MEO)", "Mayondon", "/images/demo-projects/drainage.webp"],
  ["demo-elb-park-v3", "DEMO: Community playground renewal", "Fictional example of improving accessible community recreation amenities. Location, progress and project details are illustrative only.", "Social welfare", "COMPLETED", "Municipal General Services Office (GSO)", "Lalakay", "/images/demo-projects/community-playground.webp"],
  ["demo-elb-lights-v3", "DEMO: Street lighting improvements", "Fictional example of improving street lighting for pedestrian and road safety. No actual procurement or installation is claimed.", "Infrastructure", "PLANNED", "Municipal Engineering Office (MEO)", "San Antonio", "/images/demo-projects/streetlights.webp"],
];

async function main() {
  if (!process.argv.includes("--confirm") || process.env.PROJECTS_DEMO_MODE !== "true" || process.env.NODE_ENV === "production") {
    throw new Error("Local-only demo seeder. Set PROJECTS_DEMO_MODE=true in .env and run node scripts/seed-projects-demo.mjs --confirm");
  }
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL missing from local .env");
  const u = new URL(value);
  if (u.protocol !== "mysql:" || !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) {
    throw new Error("This demo seeder only connects to localhost MySQL/MariaDB; never to a remote/production database.");
  }
  const database = decodeURIComponent(u.pathname.slice(1));
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error("Invalid local database name.");
  const conn = await createConnection({host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database});
  try {
    const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (!email) throw new Error("ADMIN_EMAIL missing in .env");
    const authors = await conn.query("SELECT id FROM user WHERE LOWER(email) = ? AND role = 'ADMIN' LIMIT 1", [email]);
    if (!authors.length) throw new Error("No Admin user found for ADMIN_EMAIL; seed or sign in with the existing Admin first.");
    await conn.beginTransaction();
    let created=0, skipped=0;
    for (const [id,title,summary,category,phase,leadOffice,barangay,photoPath] of examples) {
      const existing = await conn.query("SELECT isDemo FROM municipal_project WHERE id = ? LIMIT 1",[id]);
      if (existing.length) {
        if (!existing[0].isDemo) throw new Error(`Refusing to overwrite non-demo project ${id}`);
        skipped++;continue;
      }
      await conn.query(`INSERT INTO municipal_project
        (id,title,summary,category,phase,leadOffice,barangaysJson,sourceUrl,isDemo,photoPath,budgetPhp,status,createdById,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,NULL,TRUE,?,NULL,'DRAFT',?,NOW(3),NOW(3))`,
        [id,title,summary,category,phase,leadOffice,JSON.stringify([barangay]),photoPath,authors[0].id]);
      created++;
    }
    await conn.commit();
    console.log(`Demo drafts added: ${created}; already present: ${skipped}. No existing projects changed.`);
    console.log("Log in as Admin, open /admin/projects, submit drafts for review, then publish the ones you want visible publicly.");
  } catch (error) { await conn.rollback(); throw error; }
  finally { await conn.end(); }
}
main().catch(err => { console.error(err.message); process.exitCode=1; });
