import { requireApiViewer } from '@/lib/access';
import { listRecords, recordDetail, addReview, setRecordScope, assistanceRoster, saveAssistanceRoster } from '@/features/census/server/data';
import { apiFailure, assertSameOrigin, json, readJson } from '@/features/civic/server/http';
import { prisma } from '@/lib/prisma';
export async function GET(request: Request) {
  try {
    const viewer = await requireApiViewer(request, 'CENSUS'), q = Object.fromEntries(new URL(request.url).searchParams);
    if (q.view === 'roster') return json(await assistanceRoster(viewer));
    if (q.view === 'authority') {
      if (viewer.role !== 'ADMIN') return json({ error: 'Admin permission required.' }, 403);
      return json(await prisma.user.findMany({ where: { role: 'STAFF' }, select: { id: true, name: true, department: true, censusScope: true, staffPermissions: { where: { module: 'CENSUS' }, select: { module: true } } }, orderBy: { name: 'asc' } }));
    }
    return json(q.id ? await recordDetail(viewer, q.kind, q.id, q) : await listRecords(viewer, q));
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const viewer = await requireApiViewer(request, 'CENSUS');
    const input = await readJson(request); const d = input as Record<string, unknown>;
    if (d?.operation === 'ASSISTANCE_ROSTER') return json(await saveAssistanceRoster(viewer, input));
    if (d?.operation === 'RECORD_SCOPE') return json(await setRecordScope(viewer, input));
    return json(await addReview(viewer, input));
  } catch (error) { return apiFailure(error); }
}
