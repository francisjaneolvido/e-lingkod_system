import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { CivicError } from '@/features/civic/validation';
import type { CivicViewer } from '@/features/civic/types';
import { mapRows, type ParsedTable } from '@/features/community/server/import-file';
import { IMPORT_FIELDS, type ImportField } from '@/features/community/domain';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';
import { assertBarangay, recordScope } from './data';

type Meta = { source: string; surveyYear: number; activityName: string; activityType: string; implementingOffice: string; intendedUse: string; activityDate?: unknown; coverage?: unknown; originalPurpose?: unknown; notes?: unknown };
type ImportInput = { table: ParsedTable; mapping: Record<number, ImportField>; meta: Meta };
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function field(v: unknown, max: number) { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new CivicError('Complete source/year/activity metadata within its length limits.', 400); return v.trim().normalize('NFKC'); }
const allowedRawFields = new Set<string>(IMPORT_FIELDS.filter(f => f !== 'IGNORE'));
function optionalMetadata(meta: Meta) {
  const result: { activityDate?: string; coverage?: string; originalPurpose?: string; notes?: string } = {};
  for (const [key, max] of [['activityDate', 10], ['coverage', 180], ['originalPurpose', 1500], ['notes', 1500]] as const) {
    const value = meta[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || value.length > max) throw new CivicError('Activity metadata exceeds its type or length limit.', 400);
    if (value.trim()) result[key] = value.trim().normalize('NFKC');
  }
  if (result.activityDate && (!/^\d{4}-\d{2}-\d{2}$/.test(result.activityDate) || !Number.isFinite(Date.parse(result.activityDate + 'T00:00:00.000Z')) || new Date(result.activityDate + 'T00:00:00.000Z').toISOString().slice(0, 10) !== result.activityDate)) throw new CivicError('Choose a valid activity date (YYYY-MM-DD).', 400);
  return result;
}
export function safeStoredProvenance(rawJson: string): string {
  try {
    const raw: unknown = JSON.parse(rawJson);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '{}';
    return JSON.stringify(Object.fromEntries(Object.entries(raw).filter(([key]) => allowedRawFields.has(key))));
  } catch { return '{}'; }
}
export function validateImport(input: ImportInput) {
  const { table, mapping, meta } = input;
  if (!table || !Array.isArray(table.headers) || !table.headers.length || table.headers.length > 100 || !Array.isArray(table.rows) || table.rows.length < 1 || table.rows.length > 5000 || !['CSV', 'XLSX'].includes(table.fileType)) throw new CivicError('Invalid import table structure.', 400);
  if (table.headers.some(v => typeof v !== 'string' || v.length > 200) || new Set(table.headers.map(h => h.trim().toLowerCase())).size !== table.headers.length) throw new CivicError('Headers must be distinct and at most 200 characters.', 400);
  if (table.rows.some(row => !Array.isArray(row) || row.length > table.headers.length || row.some(v => typeof v !== 'string' || v.length > 500))) throw new CivicError('Rows contain too many columns or oversized cells.', 400);
  const entries = Object.entries(mapping ?? {}), used = entries.filter(([, v]) => v !== 'IGNORE').map(([, v]) => v);
  if (!entries.length || entries.some(([k, v]) => !/^\d+$/.test(k) || Number(k) >= table.headers.length || !IMPORT_FIELDS.includes(v)) || new Set(used).size !== used.length || !used.includes('participantRef') || !used.some(k => !['participantRef', 'IGNORE'].includes(k))) throw new CivicError('Map a stable source reference and distinct analytical columns.', 400);
  if (table.sourceRowNumbers && (table.sourceRowNumbers.length !== table.rows.length || table.sourceRowNumbers.some((n,i,all) => !Number.isInteger(n) || n < 2 || n > 1048576 || (i > 0 && n <= all[i-1])))) throw new CivicError("Invalid source row coordinates.", 400);
  const source = field(meta?.source, 180).toUpperCase();
  if (!Number.isInteger(meta.surveyYear) || meta.surveyYear < 2020 || meta.surveyYear > new Date().getFullYear() + 1) throw new CivicError('Choose the actual source survey year.', 400);
  if (!['INTERNAL_STATISTICS', 'PROGRAM_PLANNING', 'RESEARCH', 'PUBLIC_AGGREGATED'].includes(meta.intendedUse)) throw new CivicError('Choose a valid intended use.', 400);
  const normalized = { source, surveyYear: meta.surveyYear, activityName: field(meta.activityName, 180), activityType: field(meta.activityType, 60), implementingOffice: field(meta.implementingOffice, 150), intendedUse: meta.intendedUse, ...optionalMetadata(meta) };
  const rows = table.rows.map((row, index) => {
    const raw = Object.fromEntries(entries.filter(([, field]) => field !== 'IGNORE').map(([column, field]) => [field, row[Number(column)] ?? '']));
    const checked = mapRows({ ...table, rows: [row], sourceRowNumbers: [table.sourceRowNumbers?.[index] ?? index + 2] }, mapping), record = checked.records[0];
    const error = checked.issues[0]?.message || (record?.qualityFlags.length ? record.qualityFlags.join('; ') : null) || (record?.barangay && !LOS_BANOS_BARANGAYS.includes(record.barangay as never) ? 'Unrecognized barangay' : null);
    if (!record) return { originalRowNumber: table.sourceRowNumbers?.[index] ?? index + 2, record: null, raw, error: error || 'No usable analytical values', contentHash: hash(raw), identityKey: null };
    const { originalRowNumber: _row, participantRef, raw: _raw, qualityFlags: _flags, ...answers } = record; void _row; void _raw; void _flags;
    const sourceRef = participantRef?.normalize('NFKC').trim() || null;
    return { originalRowNumber: table.sourceRowNumbers?.[index] ?? index + 2, record: { ...record, participantRef: sourceRef }, raw, error, contentHash: hash(answers), identityKey: sourceRef ? hash([source, meta.surveyYear, sourceRef]) : null };
  });
  return { meta: normalized, rows, fingerprint: hash({ meta: normalized, mapping: Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b)), rows: table.rows, ...(table.sourceRowNumbers ? { sourceRowNumbers: table.sourceRowNumbers } : {}), fileType: table.fileType, sourceFilename: field(table.sourceFilename, 220) }) };
}
function result(batch: { id: string; validCount: number; skippedCount: number; invalidCount: number; reviewNeededCount: number; warningCount: number; duplicateCount: number }, replayed = false) {
  return { success: true, batchId: batch.id, imported: batch.validCount, skipped: batch.skippedCount, rejected: batch.invalidCount, reviewNeeded: batch.reviewNeededCount, count: batch.validCount, warningCount: batch.warningCount, duplicateCount: batch.duplicateCount, replayed };
}
export async function commitImport(viewer: CivicViewer, input: ImportInput) {
  const scope = await recordScope(viewer), checked = validateImport(input);
  for (const row of checked.rows) if (row.record && !row.error) assertBarangay(scope, row.record.barangay);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        // All B3 source-registry writes serialize on this row, across concurrent batches.
        await tx.censusImportLock.upsert({ where: { id: 1 }, create: { id: 1 }, update: { version: { increment: 1 } } });
        const existing = await tx.communityImportBatch.findUnique({ where: { fingerprint: checked.fingerprint } });
        if (existing) return result(existing, true);
        const activity = await tx.governmentActivity.create({ data: { activityName: checked.meta.activityName, activityType: checked.meta.activityType, implementingOffice: checked.meta.implementingOffice, originalDataSource: checked.meta.source, intendedUse: checked.meta.intendedUse, activityDate: checked.meta.activityDate ? new Date(checked.meta.activityDate + 'T00:00:00.000Z') : null, coverage: checked.meta.coverage, originalPurpose: checked.meta.originalPurpose, notes: checked.meta.notes } });
        const batch = await tx.communityImportBatch.create({ data: { activityId: activity.id, importedById: viewer.id, sourceFilename: input.table.sourceFilename, fileType: input.table.fileType, fingerprint: checked.fingerprint, sourceKey: checked.meta.source, surveyYear: checked.meta.surveyYear, recordCount: checked.rows.length } });
        let imported = 0, skipped = 0, rejected = 0, reviewNeeded = 0;
        const conflicts = new Set<string>(); const variants = new Map<string, Set<string>>();
        for (const row of checked.rows) if (row.identityKey && !row.error) { const hashes = variants.get(row.identityKey) ?? new Set<string>(); hashes.add(row.contentHash); variants.set(row.identityKey, hashes); }
        for (const [key, values] of variants) if (values.size > 1) conflicts.add(key);
        for (const row of checked.rows) {
          const r = row.record; let outcome = 'ACCEPTED', reason: string | null = null;
          const flags = ['Cross-source overlap uncertain: no automatic identity merge or citizen replacement.'];
          if (row.error) { outcome = 'REJECTED'; reason = row.error; rejected++; }
          else if (!row.identityKey || !r?.participantRef) { outcome = 'REVIEW_NEEDED'; reason = 'Stable source reference missing; identity is unknown.'; reviewNeeded++; }
          else {
            const existingSource = await tx.censusSourceRecord.findUnique({ where: { identityKey: row.identityKey } });
            if (conflicts.has(row.identityKey) || existingSource?.conflicted || (existingSource && existingSource.contentHash !== row.contentHash)) {
              outcome = 'REVIEW_NEEDED'; reason = 'Conflicting versions of the same source/year/reference require review.'; reviewNeeded++;
              await tx.censusSourceRecord.upsert({ where: { identityKey: row.identityKey }, create: { identityKey: row.identityKey, sourceKey: checked.meta.source, surveyYear: checked.meta.surveyYear, sourceRef: r.participantRef, contentHash: row.contentHash, conflicted: true }, update: { conflicted: true } });
              // MySQL's human-text collation is case/accent insensitive. Source
              // references are opaque: compare exact normalized identities in JS.
              const candidates = await tx.communityImportRecord.findMany({ where: { sourceKey: checked.meta.source, surveyYear: checked.meta.surveyYear, participantRef: r.participantRef, outcome: 'ACCEPTED' }, select: { id: true, sourceKey: true, participantRef: true } });
              const ids = candidates.filter(c => c.sourceKey === checked.meta.source && c.participantRef === r.participantRef).map(c => c.id);
              if (ids.length) await tx.communityImportRecord.updateMany({ where: { id: { in: ids } }, data: { outcome: 'REVIEW_NEEDED', outcomeReason: reason } });
            } else if (existingSource) { outcome = 'SKIPPED'; reason = 'Same stable source/year/reference and normalized content already accepted.'; skipped++; }
            else { await tx.censusSourceRecord.create({ data: { identityKey: row.identityKey, sourceKey: checked.meta.source, surveyYear: checked.meta.surveyYear, sourceRef: r.participantRef, contentHash: row.contentHash } }); imported++; }
          }
          await tx.communityImportRecord.create({ data: { batchId: batch.id, originalRowNumber: row.originalRowNumber, sourceKey: checked.meta.source, surveyYear: checked.meta.surveyYear, contentHash: row.contentHash, outcome, outcomeReason: reason,
            participantRef: r?.participantRef, barangay: r?.barangay, ageGroup: r?.ageGroup, educationLevel: r?.educationLevel, employmentStatus: r?.employmentStatus, occupation: r?.occupation, industry: r?.industry, trainingInterest: r?.trainingInterest, businessSector: r?.businessSector,
            skillsJson: JSON.stringify(r?.skills ?? []), trainingCategoriesJson: JSON.stringify(r?.trainingCategories ?? []), trainingProgramsJson: JSON.stringify(r?.trainingPrograms ?? []), trainingBarriersJson: JSON.stringify(r?.trainingBarriers ?? []), employmentBarriersJson: JSON.stringify(r?.employmentBarriers ?? []), assistanceNeededJson: JSON.stringify(r?.assistanceNeeded ?? []), rawJson: JSON.stringify(row.raw), qualityFlagsJson: JSON.stringify([...flags, ...(r?.qualityFlags ?? [])]) } });
        }
        const saved = await tx.communityImportBatch.update({ where: { id: batch.id }, data: { validCount: imported, skippedCount: skipped, invalidCount: rejected, reviewNeededCount: reviewNeeded, duplicateCount: skipped, warningCount: checked.rows.length } });
        return result(saved);
      }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 30000 });
    } catch (error) { if (attempt < 3 && typeof error === 'object' && error !== null && 'code' in error && ['P2034', 'P2002'].includes(String(error.code))) continue; throw error; }
  }
  throw new CivicError('Import conflict; retry the identical request.', 409);
}
