import { prisma } from "@/lib/prisma";
import { requireApiViewer } from "@/lib/access";
import { STAFF_MODULES, type StaffModule } from "@/lib/staff-access";
import { CivicError } from "@/features/civic/validation";
import { apiFailure, assertSameOrigin, json, readJson } from "@/features/civic/server/http";

type StaffInput = { email: string; department: string; designation: string; modules: StaffModule[]; mode: "SAVE" | "REVOKE" };
function parseStaffInput(value: unknown): StaffInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid staff request.", 400);
  const data = value as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const department = typeof data.department === "string" ? data.department.trim().replace(/\s+/g, " ") : "";
  const designation = typeof data.designation === "string" ? data.designation.trim() : "";
  const mode = data.mode === "REVOKE" ? "REVOKE" : data.mode === "SAVE" ? "SAVE" : null;
  const modules = data.modules;
  if (!mode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) throw new CivicError("Enter an existing, valid account email.", 400);
  if (department.length > 120 || designation.length > 120) throw new CivicError("Department and designation must be at most 120 characters.", 400);
  if (!Array.isArray(modules) || modules.length > STAFF_MODULES.length || modules.some(m => typeof m !== "string" || !STAFF_MODULES.includes(m as StaffModule))) throw new CivicError("Invalid module permissions.", 400);
  const unique = [...new Set(modules)] as StaffModule[];
  if (mode === "SAVE" && (!department || !designation || !unique.length)) throw new CivicError("Provide a department, designation, and at least one permitted module.", 400);
  return { email, department, designation, modules: unique, mode };
}

// POST is restricted to ADMIN and same-origin, with server-side role validation.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiViewer(request, true);
    const input = parseStaffInput(await readJson(request));
    const result = await prisma.$transaction(async tx => {
      const target = await tx.user.findUnique({ where: { email: input.email }, select: { id: true, role: true, name: true, department: true } });
      if (!target) throw new CivicError("No account exists for this email. Ask the staff member to register first.", 404);
      if (target.id === actor.id || target.role === "ADMIN") throw new CivicError("Super Admin accounts cannot be edited here.", 403);
      if (target.role !== "STAFF" && target.role !== "CITIZEN") throw new CivicError("This account cannot be assigned.", 400);
      if (input.mode === "REVOKE" && target.role !== "STAFF") throw new CivicError("This account is not an active staff member.", 400);
      const servicesAccessLost = target.role === "STAFF" && (input.mode === "REVOKE" || !input.modules.includes("SERVICES") || target.department !== input.department);
      if (servicesAccessLost) {
        const activeServiceRequests = await tx.serviceRequest.count({
          where: { assignedStaffId: target.id, status: { notIn: ["COMPLETED", "DECLINED", "CANCELLED"] } },
        });
        if (activeServiceRequests > 0) {
          throw new CivicError(`Reassign ${activeServiceRequests} active Online LGU Services request(s) before changing this staff member's office or permissions.`, 409);
        }
      }
      const updated = await tx.user.updateMany({
        where: { id: target.id, role: { in: input.mode === "SAVE" ? ["CITIZEN", "STAFF"] : ["STAFF"] } },
        data: input.mode === "SAVE" ? { role: "STAFF", department: input.department, designation: input.designation } : { role: "CITIZEN", department: null, designation: null },
      });
      if (updated.count !== 1) throw new CivicError("Role changed while saving. Refresh and try again.", 409);
      // If an officer loses access or changes office, return their cases to
      // the original office queue rather than leaving them assigned to an
      // officer who can no longer act on them.
      const accessRemoved = input.mode === "REVOKE" || !input.modules.includes("REPORTS") || target.department !== input.department;
      if (target.role === "STAFF" && accessRemoved) {
        const cases = await tx.civicReport.findMany({ where: { assignedStaffId: target.id, status: { notIn: ["RESOLVED", "REJECTED"] } }, select: { id: true, status: true, priority: true, assignedOffice: true, version: true } });
        for (const report of cases) {
          const change = await tx.civicReport.updateMany({ where: { id: report.id, version: report.version, assignedStaffId: target.id }, data: { assignedStaffId: null, version: { increment: 1 } } });
          if (change.count !== 1) throw new CivicError("A case changed while removing staff access. Try again.", 409);
          await tx.reportUpdate.create({ data: { reportId: report.id, actorId: actor.id, status: report.status, assignedOffice: report.assignedOffice, priority: report.priority, assignedStaffId: null, action: "ASSIGNMENT", visibility: "INTERNAL", note: "Officer permissions changed; this case has returned to the office queue." } });
        }
      }
      await tx.staffPermission.deleteMany({ where: { userId: target.id } });
      if (input.mode === "SAVE") await tx.staffPermission.createMany({ data: input.modules.map(module => ({ userId: target.id, module })) });
      await tx.staffAccessAudit.create({ data: {
        actorId: actor.id, targetUserId: target.id, action: input.mode,
        details: JSON.stringify({ department: input.mode === "SAVE" ? input.department : null, designation: input.mode === "SAVE" ? input.designation : null, modules: input.mode === "SAVE" ? input.modules : [] }),
      }});
      return { id: target.id, name: target.name, email: input.email, role: input.mode === "SAVE" ? "STAFF" : "CITIZEN" };
    });
    return json({ success: true, account: result });
  } catch (error) { return apiFailure(error); }
}
