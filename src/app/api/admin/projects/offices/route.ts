import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { CivicError } from "@/features/civic/validation";
import { officeContactInput, projectStaffMayEdit, projectText } from "@/features/projects/domain";

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid request format.", 400);
  return value as Record<string, unknown>;
}
function reject(text: string): never { throw new CivicError(text, 400); }
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "PROJECTS");
    const body = obj(await readJson(request));
    const action = projectText(body.action, "Action", 40);
    if (action === "office.propose") {
      const values = officeContactInput(body);
      if (viewer.role !== "ADMIN" && !projectStaffMayEdit(viewer.department, values.officeName)) {
        throw new CivicError("Only authorized office staff, MPDO or PIO can propose this contact.", 403);
      }
      const proposal = await prisma.municipalOfficeDirectoryProposal.create({data: { ...values, submittedById: viewer.id }, select: { id: true }});
      return json({ ok: true, id: proposal.id });
    }
    if (viewer.role !== "ADMIN") throw new CivicError("Super Admin review required.", 403);
    if (action === "office.review") {
      const id = projectText(body.id, "Proposal ID", 191);
      const decision = body.decision;
      if (decision !== "APPROVE" && decision !== "RETURN") return reject("Invalid review decision.");
      const reason = projectText(body.reason ?? "", "Review note", 700, false);
      if (decision === "RETURN" && !reason) return reject("A return reason is required.");
      await prisma.$transaction(async tx => {
        const proposal = await tx.municipalOfficeDirectoryProposal.findUnique({ where: { id } });
        if (!proposal || proposal.status !== "PENDING_REVIEW") return reject("Proposal was already reviewed or is missing.");
        const moved = await tx.municipalOfficeDirectoryProposal.updateMany({ where: { id, status: "PENDING_REVIEW" }, data: { status: decision === "APPROVE" ? "APPROVED" : "RETURNED", reviewedById: viewer.id, reviewedAt: new Date(), reviewNote: reason || null } });
        if (!moved.count) return reject("Proposal already reviewed.");
        if (decision === "APPROVE") {
          const values = { phone: proposal.phone, extension: proposal.extension, email: proposal.email, officeHours: proposal.officeHours, address: proposal.address, notes: proposal.notes, sourceUrl: proposal.sourceUrl, isPublished: true, verifiedAt: new Date(), verifiedById: viewer.id };
          await tx.municipalOfficeDirectoryEntry.upsert({ where: { officeName: proposal.officeName }, create: { officeName: proposal.officeName, ...values }, update: values });
        }
      });
      return json({ ok: true });
    }
    if (action === "office.publish") {
      // Direct verified override by Admin; cannot be changed publicly until server-side verification action completes.
      const values = officeContactInput(body);
      const entry = await prisma.municipalOfficeDirectoryEntry.upsert({ where: { officeName: values.officeName }, create: { ...values, isPublished: true, verifiedAt: new Date(), verifiedById: viewer.id }, update: { ...values, isPublished: true, verifiedAt: new Date(), verifiedById: viewer.id } });
      return json({ ok: true, id: entry.id });
    }
    if (action === "office.unpublish") {
      const officeName = projectText(body.officeName, "Office name", 160);
      await prisma.municipalOfficeDirectoryEntry.updateMany({ where: { officeName }, data: { isPublished: false } });
      return json({ ok: true });
    }
    return reject("Unknown directory action.");
  } catch (error) {
    if (error instanceof Error && !(error instanceof CivicError) && /^(Office |Phone |Provide |An official |Choose |Select)/.test(error.message)) return json({ error: error.message }, 400);
    return apiFailure(error);
  }
}
