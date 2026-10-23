import { requireApiViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, readJson, json, apiFailure } from "@/features/civic/server/http";
import { CivicError } from "@/features/civic/validation";
import { PROJECT_PHASES, PROJECT_CATEGORIES, projectBarangays, projectChoice, projectOffice, projectPercent, projectStaffMayEdit, projectText, officialProjectSource, projectDisclosure, demoProjectInput } from "@/features/projects/domain";

function invalid(message: string): never { throw new CivicError(message, 400); }
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Invalid request format.");
  return value as Record<string, unknown>;
}
function id(value: unknown) { return projectText(value, "Record ID", 191); }
function admin(role: string) { if (role !== "ADMIN") throw new CivicError("Super Admin review required.", 403); }
function fields(data: Record<string, unknown>) {
  return { title: projectText(data.title, "Project title", 180), summary: projectText(data.summary, "Public summary", 900),
    category: projectChoice(data.category, PROJECT_CATEGORIES, "category"), phase: projectChoice(data.phase, PROJECT_PHASES, "project stage"),
    leadOffice: projectOffice(data.leadOffice), barangaysJson: JSON.stringify(projectBarangays(data.barangays)),
    ...demoProjectInput(data, process.env.PROJECTS_DEMO_MODE === "true" && process.env.NODE_ENV !== "production"), ...projectDisclosure(data) };
}
function staffCanManage(role: string, department: string | null | undefined, leadOffice: string) {
  if (role === "ADMIN") return;
  if (!projectStaffMayEdit(department, leadOffice)) throw new CivicError("You can only manage your office's projects, unless assigned to MPDO or PIO.", 403);
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer = await requireApiViewer(request, "PROJECTS");
    const body = obj(await readJson(request));
    const action = projectText(body.action, "Action", 40);
    if (action === "project.save") {
      const values = fields(body);
      staffCanManage(viewer.role, viewer.department, values.leadOffice);
      const projectId = body.id ? id(body.id) : null;
      if (!projectId) {
        const created = await prisma.municipalProject.create({ data: { ...values, createdById: viewer.id }, select: { id: true } });
        return json({ ok: true, id: created.id });
      }
      const existing = await prisma.municipalProject.findUnique({ where: { id: projectId } });
      if (!existing) return invalid("Project no longer exists.");
      if (viewer.role !== "ADMIN" && existing.createdById !== viewer.id) throw new CivicError("Only the project author can edit this draft.", 403);
      staffCanManage(viewer.role, viewer.department, existing.leadOffice);
      const updated = await prisma.municipalProject.updateMany({ where: { id: projectId, status: { in: ["DRAFT", "RETURNED"] } }, data: { ...values, status: "DRAFT", reviewNote: null } });
      if (!updated.count) return invalid("Only draft or returned projects may be edited. Published projects are updated through reviewed progress entries.");
      return json({ ok: true, id: projectId });
    }
    if (action === "project.submit") {
      const projectId = id(body.id);
      const project = await prisma.municipalProject.findUnique({ where: { id: projectId } });
      if (!project) return invalid("Project not found.");
      staffCanManage(viewer.role, viewer.department, project.leadOffice);
      if (viewer.role !== "ADMIN" && project.createdById !== viewer.id) throw new CivicError("Only the author may submit this project.", 403);
      const moved = await prisma.municipalProject.updateMany({ where: { id: projectId, status: { in: ["DRAFT", "RETURNED"] } }, data: { status: "PENDING_REVIEW", reviewNote: null } });
      if (!moved.count) return invalid("Only draft or returned projects may be submitted.");
      return json({ ok: true });
    }
    if (action === "project.review") {
      admin(viewer.role);
      const projectId = id(body.id), decision = body.decision;
      if (decision !== "PUBLISH" && decision !== "RETURN") return invalid("Invalid decision.");
      const reason = projectText(body.reason ?? "", "Review note", 700, false);
      if (decision === "RETURN" && !reason) return invalid("Provide a return reason.");
      const reviewed = await prisma.municipalProject.findUnique({ where: { id: projectId }, select: { isDemo: true } });
      if (reviewed?.isDemo && (process.env.PROJECTS_DEMO_MODE !== "true" || process.env.NODE_ENV === "production")) return invalid("DEMO publishing is disabled in this environment.");
      const changed = await prisma.municipalProject.updateMany({ where: { id: projectId, status: "PENDING_REVIEW" }, data: {
        status: decision === "PUBLISH" ? "PUBLISHED" : "RETURNED", reviewedById: viewer.id,
        reviewNote: reason || null, publishedAt: decision === "PUBLISH" ? new Date() : null,
      } });
      if (!changed.count) return invalid("Project is no longer pending review.");
      return json({ ok: true });
    }
    if (action === "project.archive") {
      admin(viewer.role);
      const changed = await prisma.municipalProject.updateMany({ where: { id: id(body.id), status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      if (!changed.count) return invalid("Only published projects can be archived.");
      return json({ ok: true });
    }
    if (action === "update.add") {
      const projectId = id(body.projectId);
      const project = await prisma.municipalProject.findUnique({ where: { id: projectId } });
      if (!project || project.status !== "PUBLISHED") return invalid("Progress updates require a published project.");
      staffCanManage(viewer.role, viewer.department, project.leadOffice);
      const created = await prisma.municipalProjectUpdate.create({ data: {
        projectId, title: projectText(body.title, "Milestone title", 160),
        details: projectText(body.details, "Progress details", 1500),
        progressPercent: projectPercent(body.progressPercent), phaseAfter: body.phaseAfter ? projectChoice(body.phaseAfter, PROJECT_PHASES, "new project stage") : null, sourceUrl: officialProjectSource(body.sourceUrl), createdById: viewer.id,
      }, select: { id: true } });
      return json({ ok: true, id: created.id });
    }
    if (action === "update.review") {
      admin(viewer.role);
      const updateId = id(body.id), decision = body.decision;
      if (decision !== "APPROVE" && decision !== "RETURN") return invalid("Invalid decision.");
      const reason = projectText(body.reason ?? "", "Review note", 700, false);
      if (decision === "RETURN" && !reason) return invalid("Provide a reason when returning a progress update.");
      const update = await prisma.municipalProjectUpdate.findUnique({ where: { id: updateId }, include: { project: { select: { status: true } } } });
      if (!update || update.project.status !== "PUBLISHED") return invalid("The project is not currently published.");
      await prisma.$transaction(async tx => {
        const changed = await tx.municipalProjectUpdate.updateMany({ where: { id: updateId, status: "PENDING_REVIEW" }, data: {
          status: decision === "APPROVE" ? "APPROVED" : "RETURNED", reviewNote: reason || null, reviewedById: viewer.id, reviewedAt: new Date(),
        } });
        if (!changed.count) invalid("This progress update was already reviewed.");
        if (decision === "APPROVE" && update.phaseAfter) {
          const moved = await tx.municipalProject.updateMany({ where: { id: update.projectId, status: "PUBLISHED" }, data: { phase: update.phaseAfter } });
          if (!moved.count) invalid("Project publication status changed. Refresh and retry.");
        }
      });
      return json({ ok: true });
    }
    return invalid("Unknown action.");
  } catch (error) {
    if (error instanceof Error && !(error instanceof CivicError) && (/^(Project |Progress |Select |Choose |Official |Public |Lead |Milestone |Review |Provide an official|Demo |DEMO |Generated )/.test(error.message))) {
      return json({ error: error.message }, 400);
    }
    return apiFailure(error);
  }
}
