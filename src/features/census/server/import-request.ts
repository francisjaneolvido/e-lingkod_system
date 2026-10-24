import 'server-only';
import { parseUploadedTable, parseMapping } from '@/features/community/server/import-file';
import { validateImport } from './imports';
import { recordScope, assertBarangay } from './data';
import type { CivicViewer } from '@/features/civic/types';

export async function mappedImportRequest(form: FormData, viewer: CivicViewer) {
  const table = await parseUploadedTable(form), mapping = parseMapping(form.get('mapping'), table.headers.length);
  const input = { table, mapping, meta: { source: String(form.get('source') || form.get('originalDataSource') || ''), surveyYear: Number(form.get('surveyYear')), activityName: String(form.get('activityName') || ''), activityType: String(form.get('activityType') || ''), implementingOffice: String(form.get('implementingOffice') || ''), intendedUse: String(form.get('intendedUse') || 'INTERNAL_STATISTICS'), activityDate: form.get('activityDate'), coverage: form.get('coverage'), originalPurpose: form.get('originalPurpose'), notes: form.get('notes') } };
  const checked = validateImport(input), scope = await recordScope(viewer);
  for (const row of checked.rows) if (row.record && !row.error) assertBarangay(scope, row.record.barangay);
  return { input, checked };
}
