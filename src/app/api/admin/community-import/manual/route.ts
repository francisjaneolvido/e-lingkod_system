import { requireApiViewer } from '@/lib/access';
import { apiFailure, assertSameOrigin, readJson, json } from '@/features/civic/server/http';
import { IMPORT_FIELDS, type ImportField } from '@/features/community/domain';
import { CivicError } from '@/features/civic/validation';
import { commitImport } from '@/features/census/server/imports';
export async function POST(request: Request) { try {
 assertSameOrigin(request); const viewer = await requireApiViewer(request, 'CENSUS'); const value = await readJson(request); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CivicError('Invalid manual source record.', 400); const d = value as Record<string, unknown>;
 const headers = IMPORT_FIELDS.filter(f => f !== 'IGNORE'); const mapping = Object.fromEntries(headers.map((field, i) => [i, field])) as Record<number, ImportField>;
 const row = headers.map(field => { const v = d[field]; if (v === undefined || v === null) return ''; if (Array.isArray(v) && v.every(s => typeof s === 'string')) return v.join('|'); if (typeof v === 'string') return v; throw new CivicError('Manual analytical values must be text or text lists.', 400); });
 return json(await commitImport(viewer, { table: { headers: [...headers], rows: [row], fileType: 'CSV', sourceFilename: 'Manual source record' }, mapping, meta: { source: String(d.source || ''), surveyYear: Number(d.surveyYear), activityName: String(d.activityName || ''), activityType: String(d.activityType || ''), implementingOffice: String(d.implementingOffice || ''), intendedUse: String(d.intendedUse || 'INTERNAL_STATISTICS'), activityDate: d.activityDate, coverage: d.coverage, originalPurpose: d.originalPurpose, notes: d.notes } }));
 } catch (error) { return apiFailure(error); } }
