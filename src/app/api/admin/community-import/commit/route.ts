import { requireApiViewer } from '@/lib/access';
import { apiFailure, assertSameOrigin, readMultipart, json } from '@/features/civic/server/http';
import { mappedImportRequest } from '@/features/census/server/import-request';
import { commitImport } from '@/features/census/server/imports';
export async function POST(request: Request) { try { assertSameOrigin(request); const viewer = await requireApiViewer(request, 'CENSUS'); const form = await readMultipart(request, 2_780_000); const { input, checked } = await mappedImportRequest(form, viewer); if (form.get('previewHash') !== checked.fingerprint) return json({ error: 'File, source, year or mapping changed. Preview again.' }, 409); return json(await commitImport(viewer, input)); } catch (error) { return apiFailure(error); } }
