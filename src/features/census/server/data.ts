import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { hasModuleAccess } from '@/lib/staff-access';
import type { CivicViewer } from '@/features/civic/types';
import { CivicError } from '@/features/civic/validation';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';

export type RecordKind = 'INDIVIDUAL' | 'ESTABLISHMENT';
type Filters = Record<string, string | undefined>;
function fail(message: string, code = 400): never { throw new CivicError(message, code); }
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail('Invalid census request.');
const text = (v: unknown, max = 191) => typeof v === 'string' && v.trim().length <= max ? v.trim() : fail('Invalid text value.');
const version = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0 ? Number(v) : fail('Refresh the current version before saving.');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const adminOnly = (v: CivicViewer) => { if (v.role !== 'ADMIN') fail('Only Admin may maintain census authority or assistance rosters.', 403); };
export async function recordScope(viewer: CivicViewer): Promise<string[] | null> {
  if (!await hasModuleAccess(viewer, 'CENSUS')) fail('CENSUS permission is required.', 403);
  if (viewer.role === 'ADMIN') return null;
  const row = await prisma.censusStaffScope.findUnique({ where: { userId: viewer.id } });
  return row ? JSON.parse(row.barangaysJson) as string[] : [];
}
export function assertBarangay(scope: string[] | null, barangay: string | null | undefined) {
  if (scope !== null && (!barangay || !scope.includes(barangay))) fail('Record is outside your authorized census scope.', 403);
}
export function paging(input: Filters) {
  const number = (s: string | undefined, fallback: number, max: number) => s === undefined || s === '' ? fallback : /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= max ? Number(s) : fail('Invalid pagination.');
  return { page: number(input.page, 1, 1_000_000), pageSize: number(input.pageSize, 20, 100) };
}
export async function setRecordScope(viewer: CivicViewer, input: unknown) {
  adminOnly(viewer); const d = obj(input), staffId = text(d.staffId), expected = version(d.expectedVersion);
  if (!Array.isArray(d.barangays) || d.barangays.some(b => !LOS_BANOS_BARANGAYS.includes(b))) fail('Choose valid barangays.');
  const barangays = [...new Set(d.barangays as string[])].sort();
  return prisma.$transaction(async tx => {
    if ((await tx.user.findUnique({ where: { id: staffId } }))?.role !== 'STAFF') fail('Choose an existing Staff account.');
    const current = await tx.censusStaffScope.findUnique({ where: { userId: staffId } });
    if ((current?.version ?? 0) !== expected) fail('Record scope changed. Refresh.', 409);
    if (current) { const changed = await tx.censusStaffScope.updateMany({ where: { userId: staffId, version: expected }, data: { barangaysJson: JSON.stringify(barangays), version: { increment: 1 } } }); if (!changed.count) fail('Scope changed.', 409); }
    else await tx.censusStaffScope.create({ data: { userId: staffId, barangaysJson: JSON.stringify(barangays) } });
    await tx.censusAudit.create({ data: { actorId: viewer.id, action: 'RECORD_SCOPE', target: staffId, detailsJson: JSON.stringify({ barangays, previousVersion: expected }) } });
    return { success: true, version: expected + 1 };
  });
}

export { listRecords, recordDetail } from './record-reads';

export async function addReview(viewer: CivicViewer, input: unknown) {
  const scope = await recordScope(viewer), d = obj(input), action = text(d.action, 20), revisionId = text(d.revisionId), note = d.note ? text(d.note, 1000) : null, requestKey = text(d.requestKey, 80);
  if (!['ASSESSED', 'VERIFIED', 'APPROVED'].includes(action) || requestKey.length < 16) fail('Choose valid review action and retry identity.');
  if (action === 'APPROVED' && viewer.role !== 'ADMIN') fail('Only Admin may approve a revision.', 403);
  const personal = d.kind === 'INDIVIDUAL'; if (!personal && d.kind !== 'ESTABLISHMENT') fail('Choose record type.');
  const revision = personal ? await prisma.communitySurveyRevision.findUnique({ where: { id: revisionId } }) : await prisma.establishmentRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.action !== 'SUBMITTED') fail('Choose an immutable submitted revision.', 404);
  assertBarangay(scope, JSON.parse(revision.answersJson).barangay);
  const payloadHash = hash({ kind: d.kind, revisionId, action, note });
  const existing = await prisma.censusReview.findUnique({ where: { actorId_requestKey: { actorId: viewer.id, requestKey } } });
  if (existing) { if (existing.payloadHash !== payloadHash) fail('Review request identity changed.', 409); return existing; }
  try { return await prisma.censusReview.create({ data: { actorId: viewer.id, action, note, requestKey, payloadHash, individualRevisionId: personal ? revisionId : null, establishmentRevisionId: personal ? null : revisionId } }); }
  catch (error) { const repeat = await prisma.censusReview.findUnique({ where: { actorId_requestKey: { actorId: viewer.id, requestKey } } }); if (repeat?.payloadHash === payloadHash) return repeat; throw error; }
}

export async function assistanceRoster(viewer: CivicViewer) {
  const scope = await recordScope(viewer);
  const rosters = await prisma.censusAssistanceRoster.findMany({ include: { members: { include: { staff: { select: { id: true, name: true, role: true } } } } } });
  const audits = await prisma.censusAudit.findMany({ where: { action: 'ASSISTANCE_ROSTER' }, orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } });
  return LOS_BANOS_BARANGAYS.filter(b => scope === null || scope.includes(b)).map(barangay => {
    const row = rosters.find(r => r.barangay === barangay), members = row?.members.filter(m => m.staff.role === 'STAFF') ?? [];
    const needsConfirmation = Boolean(row && row.members.length !== members.length);
    return { barangay, count: row && !(needsConfirmation && members.length === 0) ? members.length : null, needsConfirmation, version: row?.version ?? 0, confirmedAt: row?.confirmedAt ?? null, maintainedBy: audits.find(a => a.target === barangay)?.actor.name ?? null, members: members.map(m => m.staff) };
  });
}
export async function saveAssistanceRoster(viewer: CivicViewer, input: unknown) {
  adminOnly(viewer); const d = obj(input), barangay = text(d.barangay, 100), expected = version(d.expectedVersion);
  if (!LOS_BANOS_BARANGAYS.includes(barangay as never) || !Array.isArray(d.staffIds) || d.staffIds.length > 100 || d.staffIds.some(s => typeof s !== 'string')) fail('Choose a valid barangay and Staff accounts.');
  const staffIds = [...new Set(d.staffIds as string[])].sort();
  return prisma.$transaction(async tx => {
    if (await tx.user.count({ where: { id: { in: staffIds }, role: 'STAFF' } }) !== staffIds.length) fail('Only existing active Staff accounts may be designated.');
    const current = await tx.censusAssistanceRoster.findUnique({ where: { barangay } });
    if ((current?.version ?? 0) !== expected) fail('Roster changed. Refresh.', 409);
    if (current) { const changed = await tx.censusAssistanceRoster.updateMany({ where: { barangay, version: expected }, data: { version: { increment: 1 }, confirmedAt: new Date() } }); if (!changed.count) fail('Roster changed.', 409); }
    else await tx.censusAssistanceRoster.create({ data: { barangay } });
    await tx.censusAssistanceMember.deleteMany({ where: { barangay } });
    if (staffIds.length) await tx.censusAssistanceMember.createMany({ data: staffIds.map(staffId => ({ barangay, staffId })) });
    await tx.censusAudit.create({ data: { actorId: viewer.id, action: 'ASSISTANCE_ROSTER', target: barangay, detailsJson: JSON.stringify({ staffIds, previousVersion: expected }) } });
    return { success: true, version: expected + 1 };
  });
}
