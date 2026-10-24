import { requireApiViewer } from '@/lib/access';
import { apiFailure, assertSameOrigin, json, readMultipart } from '@/features/civic/server/http';
import { parseUploadedTable, parseMapping } from '@/features/community/server/import-file';
import { commitImport, validateImport, safeStoredProvenance } from '@/features/census/server/imports';
import { prisma } from '@/lib/prisma';
import { recordScope, paging, assertBarangay } from '@/features/census/server/data';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const viewer = await requireApiViewer(request, 'CENSUS');
    const form = await readMultipart(request, 2_780_000), table = await parseUploadedTable(form);
    if (form.get('action') === 'INSPECT') return json({ headers: table.headers, totalRows: table.rows.length, sourceFilename: table.sourceFilename, sampleRows: table.rows.slice(0, 5) });
    const mapping = parseMapping(form.get('mapping'), table.headers.length);
    const input = { table, mapping, meta: { source: String(form.get('source') || ''), surveyYear: Number(form.get('surveyYear')), activityName: String(form.get('activityName') || ''), activityType: String(form.get('activityType') || ''), implementingOffice: String(form.get('implementingOffice') || ''), intendedUse: String(form.get('intendedUse') || 'INTERNAL_STATISTICS'), activityDate: form.get('activityDate'), coverage: form.get('coverage'), originalPurpose: form.get('originalPurpose'), notes: form.get('notes') } };
    const checked = validateImport(input);
    const scope = await recordScope(viewer); for (const row of checked.rows) if (row.record && !row.error) assertBarangay(scope, row.record.barangay);
    if (form.get('action') === 'PREVIEW') return json({ fingerprint: checked.fingerprint, total: checked.rows.length, rejected: checked.rows.filter(r => r.error).length, rows: checked.rows.map(r => ({ row: r.originalRowNumber, error: r.error, missingReference: !r.identityKey })) });
    if (form.get('previewHash') !== checked.fingerprint) return json({ error: 'File, mapping or metadata changed; preview again.' }, 409);
    return json(await commitImport(viewer, input));
  } catch (error) { return apiFailure(error); }
}
export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request, 'CENSUS'), scope = await recordScope(viewer), q = Object.fromEntries(new URL(request.url).searchParams), { page, pageSize } = paging(q);
    // Batch details contain private provenance; scoped staff see only their own imports,
    // filtered again by current authorized barangays. Admin has the complete inventory.
    const batchWhere = scope === null ? {} : { importedById: viewer.id };
    if (q.id) {
      const batch = await prisma.communityImportBatch.findFirst({ where: { id: q.id, ...batchWhere }, include: { activity: true, importedBy: { select: { name: true } } } });
      if (!batch) return json({ error: 'Batch not found.' }, 404);
      const where = { batchId: batch.id, ...(scope !== null ? { barangay: { in: scope } } : {}) };
      const [total, rows] = await prisma.$transaction([prisma.communityImportRecord.count({ where }), prisma.communityImportRecord.findMany({ where, orderBy: [{ originalRowNumber: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize })]);
      return json({ batch, rows: rows.map(row => ({ ...row, rawJson: safeStoredProvenance(row.rawJson) })), total, page, pageSize });
    }
    const [total, batches] = await prisma.$transaction([prisma.communityImportBatch.count({ where: batchWhere }), prisma.communityImportBatch.findMany({ where: batchWhere, include: { activity: true, importedBy: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize })]);
    return json({ total, batches, page, pageSize });
  } catch (error) { return apiFailure(error); }
}
