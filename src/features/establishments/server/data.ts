import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { CivicViewer } from "@/features/civic/types";
import { CivicError } from "@/features/civic/validation";
import { establishmentIdentity, establishmentYear, parseEstablishmentAnswers, requestObject, type EstablishmentAnswers } from "../domain";

type Tx = Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function citizen(viewer: CivicViewer) { if (viewer.role !== "CITIZEN") throw new CivicError("Only Citizen accounts can manage their establishment surveys.", 403); }
function identifier(value: unknown) { if (typeof value !== "string" || !value || value.length > 191) throw new CivicError("Choose an establishment.", 400); return value; }
function version(value: unknown) { if (!Number.isSafeInteger(value) || Number(value) < 0) throw new CivicError("Refresh your saved survey before continuing; its version is required.", 400); return Number(value); }
function key(value: unknown) { if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{16,64}$/.test(value)) throw new CivicError("A valid request key is required.", 400); return value; }
const identityFields = (answers: EstablishmentAnswers) => ({ businessName: answers.businessName, officeType: answers.officeType, street: answers.street, barangay: answers.barangay, municipality: answers.municipality, province: answers.province, identityKey: hash(establishmentIdentity(answers)) });
const decode = (value: string) => JSON.parse(value) as EstablishmentAnswers;
function receipt(row: { payloadHash: string; establishmentId: string; recordVersion: number; workspaceVersion: number; revisionId: string | null }, payloadHash: string, replayed = true) {
  if (row.payloadHash !== payloadHash) throw new CivicError("This request key was already used for a different operation. Refresh before starting a new one.", 409);
  return { success: true, establishmentId: row.establishmentId, recordVersion: row.recordVersion, workspaceVersion: row.workspaceVersion, revisionId: row.revisionId, replayed };
}
async function owned(tx: Tx, viewer: CivicViewer, id: string) {
  const record = await tx.establishment.findFirst({ where: { id, ownerId: viewer.id } });
  if (!record) throw new CivicError("Establishment not found.", 404);
  return record;
}
// Unique-key/deadlock races can be a retry of a transaction that just committed.
// Re-read the receipt before turning them into a conflict; never retry a write blindly.
async function mutation(viewer: CivicViewer, requestKey: string, payloadHash: string, work: (tx: Tx) => Promise<ReturnType<typeof receipt>>) {
  const where = { ownerId_requestKey: { ownerId: viewer.id, requestKey } };
  try {
    return await prisma.$transaction(async tx => {
      const previous = await tx.establishmentOperation.findUnique({ where });
      if (previous) return receipt(previous, payloadHash);
      return work(tx);
    }, { isolationLevel: "RepeatableRead", timeout: 10000 });
  } catch (error) {
    const committed = await prisma.establishmentOperation.findUnique({ where });
    if (committed) return receipt(committed, payloadHash);
    if (error && typeof error === "object" && "code" in error && ["P2002", "P2034"].includes(String(error.code))) throw new CivicError("An establishment with this identity already exists in your records, or its survey changed. Refresh your records before trying again.", 409);
    throw error;
  }
}
export async function listOwnedEstablishments(viewer: CivicViewer) {
  citizen(viewer);
  return prisma.establishment.findMany({ where: { ownerId: viewer.id }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, businessName: true, officeType: true, street: true, barangay: true } });
}
export async function ownedEstablishmentState(viewer: CivicViewer, id: string, inputYear: unknown = undefined) {
  citizen(viewer); id = identifier(id); const surveyYear = establishmentYear(inputYear);
  return prisma.$transaction(async tx => {
    const record = await owned(tx, viewer, id);
    const survey = await tx.establishmentSurvey.findUnique({ where: { establishmentId_surveyYear: { establishmentId: id, surveyYear } } });
    const revisions = survey ? await tx.establishmentRevision.findMany({ where: { surveyId: survey.id }, orderBy: { revision: "desc" } }) : [];
    const draft = survey?.draftJson ? decode(survey.draftJson) : null;
    const submitted = survey?.status === "SUBMITTED" && survey.submittedJson ? decode(survey.submittedJson) : null;
    const establishment = { id:record.id, businessName:record.businessName, officeType:record.officeType, street:record.street, barangay:record.barangay, municipality:record.municipality, province:record.province };
    return { establishment, surveyYear, recordVersion: record.version, workspaceVersion: survey?.version ?? 0,
      status: draft ? "DRAFT" : survey?.status ?? "DRAFT", submittedStatus: survey?.status ?? null, hasDraft: Boolean(draft),
      answers: draft ?? submitted ?? parseEstablishmentAnswers({ ...establishment, surveyYear }, "DRAFT"), submitted,
      submittedAt: survey?.submittedAt?.toISOString() ?? null,
      history: revisions.map(row => ({ id: row.id, revision: row.revision, action: row.action, actorId: row.actorId, createdAt: row.createdAt.toISOString(), answers: decode(row.answersJson) })) };
  }, { isolationLevel: "RepeatableRead" });
}
export type EstablishmentState = Awaited<ReturnType<typeof ownedEstablishmentState>>;
export type EstablishmentList = Awaited<ReturnType<typeof listOwnedEstablishments>>;
export async function createEstablishment(input: unknown, viewer: CivicViewer) {
  citizen(viewer); const raw = requestObject(input), answers = parseEstablishmentAnswers(raw, "DRAFT"), requestKey = key(raw.requestKey), payloadHash = hash({ action: "CREATE", answers });
  return mutation(viewer, requestKey, payloadHash, async tx => {
    const record = await tx.establishment.create({ data: { ownerId: viewer.id, ...identityFields(answers) } });
    await tx.establishmentSurvey.create({ data: { establishmentId: record.id, surveyYear: answers.surveyYear, draftJson: JSON.stringify(answers) } });
    const operation = await tx.establishmentOperation.create({ data: { ownerId: viewer.id, establishmentId: record.id, requestKey, payloadHash, recordVersion: 0, workspaceVersion: 0 } });
    return receipt(operation, payloadHash, false);
  });
}
async function writeSurvey(input: unknown, viewer: CivicViewer, withdrawing: boolean) {
  citizen(viewer); const raw = requestObject(input), id = identifier(raw.establishmentId), surveyYear = establishmentYear(raw.surveyYear), expectedRecordVersion = version(raw.expectedRecordVersion), expectedVersion = version(raw.expectedVersion), requestKey = key(raw.requestKey);
  if (!withdrawing && raw.status !== "DRAFT" && raw.status !== "SUBMITTED") throw new CivicError("Choose draft or submission.", 400);
  const action = withdrawing ? "WITHDRAWN" : raw.status as "DRAFT" | "SUBMITTED";
  const answers = withdrawing ? null : parseEstablishmentAnswers(raw, action as "DRAFT" | "SUBMITTED");
  if (raw.correctIdentity !== undefined && typeof raw.correctIdentity !== "boolean") throw new CivicError("Choose explicitly whether to correct the current establishment identity.", 400);
  const correctIdentity = raw.correctIdentity === true;
  if (withdrawing && correctIdentity) throw new CivicError("Withdraw the survey separately from correcting establishment identity.", 400);
  // Preserve the original default request hash, including old pending retries.
  const payloadHash = hash({ id, surveyYear, action, answers, expectedRecordVersion, expectedVersion, ...(correctIdentity ? { correctIdentity: true } : {}) });
  return mutation(viewer, requestKey, payloadHash, async tx => {
    await owned(tx, viewer, id);
    // Global CAS also prevents different survey years from overwriting unseen identity edits.
    const changed = await tx.establishment.updateMany({ where: { id, ownerId: viewer.id, version: expectedRecordVersion }, data: { version: { increment: 1 }, ...(answers && correctIdentity ? identityFields(answers) : {}) } });
    if (changed.count !== 1) throw new CivicError("This establishment changed. Refresh saved state before editing again.", 409);
    const where = { establishmentId_surveyYear: { establishmentId: id, surveyYear } };
    let survey = await tx.establishmentSurvey.findUnique({ where });
    if (!survey) {
      if (withdrawing) throw new CivicError("There is no saved survey to withdraw for this year.", 400);
      if (expectedVersion !== 0) throw new CivicError("This survey changed. Refresh saved state.", 409);
      survey = await tx.establishmentSurvey.create({ data: { establishmentId: id, surveyYear } });
    }
    const data: Prisma.EstablishmentSurveyUpdateManyMutationInput = { version: { increment: 1 }, draftJson: action === "DRAFT" ? JSON.stringify(answers) : null };
    if (action === "SUBMITTED") Object.assign(data, { status: "SUBMITTED", submittedJson: JSON.stringify(answers), submittedAt: new Date() });
    if (action === "WITHDRAWN") data.status = "WITHDRAWN";
    const saved = await tx.establishmentSurvey.updateMany({ where: { id: survey.id, version: expectedVersion }, data });
    if (saved.count !== 1) throw new CivicError("This survey changed. Refresh saved state before editing again.", 409);
    let revisionId: string | null = null;
    if (action !== "DRAFT") {
      const last = await tx.establishmentRevision.findFirst({ where: { surveyId: survey.id }, orderBy: { revision: "desc" }, select: { revision: true } });
      const snapshot = answers ?? (survey.draftJson ? decode(survey.draftJson) : survey.submittedJson ? decode(survey.submittedJson) : parseEstablishmentAnswers({ ...await owned(tx, viewer, id), surveyYear }, "DRAFT"));
      const revision = await tx.establishmentRevision.create({ data: { surveyId: survey.id, revision: (last?.revision ?? 0) + 1, action, actorId: viewer.id, answersJson: JSON.stringify(snapshot) } });
      revisionId = revision.id;
    }
    const operation = await tx.establishmentOperation.create({ data: { ownerId: viewer.id, establishmentId: id, requestKey, payloadHash, recordVersion: expectedRecordVersion + 1, workspaceVersion: expectedVersion + 1, revisionId } });
    return receipt(operation, payloadHash, false);
  });
}
export const saveEstablishmentSurvey = (input: unknown, viewer: CivicViewer) => writeSurvey(input, viewer, false);
export const withdrawEstablishmentSurvey = (input: unknown, viewer: CivicViewer) => writeSurvey(input, viewer, true);
