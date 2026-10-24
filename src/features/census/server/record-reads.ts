import 'server-only';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type { CivicViewer } from '@/features/civic/types';
import { CivicError } from '@/features/civic/validation';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';
import { EMPLOYMENT_STATUSES } from '@/features/community/domain';
import { INDUSTRIES } from '@/features/establishments/domain';
import { recordScope, assertBarangay, paging } from './data';

type Filters = Record<string, string | undefined>;
type Answers = Record<string, unknown>;
function fail(message: string, status = 400): never { throw new CivicError(message, status); }
const decode = (raw: string | null) => raw ? JSON.parse(raw) as Answers : null;
function allowed(scope: string[] | null, value: Answers | null) {
  return value !== null && (scope === null || typeof value.barangay === 'string' && scope.includes(value.barangay));
}
const extracted = (json: string, field: string) => "JSON_UNQUOTE(JSON_EXTRACT(" + json + ",'$." + field + "'))";
// UNION branches need a common text collation; authorization itself uses BINARY
// comparisons so it agrees with exact approved barangay values used by reviews.
const label = (expression: string) => 'CAST(' + expression + ' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci';

export async function listRecords(viewer: CivicViewer, input: Filters) {
  const scope = await recordScope(viewer), { page, pageSize } = paging(input);
  const kind = input.kind || 'INDIVIDUAL';
  if (!['INDIVIDUAL', 'ESTABLISHMENT'].includes(kind)) fail('Choose record type.');
  if (input.barangay) { if (!LOS_BANOS_BARANGAYS.includes(input.barangay as never)) fail('Choose a valid barangay.'); assertBarangay(scope, input.barangay); }
  if (input.year && (!/^\d{4}$/.test(input.year) || Number(input.year) < 2020 || Number(input.year) > new Date().getFullYear() + 1)) fail('Choose valid year.');
  if (input.employment && !EMPLOYMENT_STATUSES.includes(input.employment as never)) fail('Choose employment category.');
  if (input.industry && !INDUSTRIES.some(i => i.value === input.industry)) fail('Choose industry.');
  if (input.status && !['DRAFT', 'SUBMITTED', 'WITHDRAWN'].includes(input.status)) fail('Choose valid status.');
  const personal = kind === 'INDIVIDUAL';
  const common = personal
    ? 'FROM community_survey_workspace w JOIN user u ON u.id=w.userId LEFT JOIN community_survey s ON s.userId=w.userId AND s.surveyYear=w.surveyYear'
    : 'FROM establishment_survey w JOIN establishment e ON e.id=w.establishmentId JOIN user u ON u.id=e.ownerId';
  function projection(json: string | null, mode: string, priority: number, status: string, revision: string, changedAt: string) {
    const name = personal ? 'u.name' : extracted(json!, 'businessName');
    const barangay = json ? extracted(json, 'barangay') : 's.barangay';
    const category = json ? extracted(json, personal ? 'employmentStatus' : 'industry') : 's.employmentStatus';
    return 'SELECT w.id,' + label(name) + ' name,' + label('u.email') + ' email,w.surveyYear,' + label(status) + ' status,' + label(barangay) + ' barangay,' + label(category) + ' category,' + "'" + mode + "' view," + priority + ' priority,' + revision + ' revision,' + changedAt + ' changedAt ';
  }
  const branches = [
    projection('w.draftJson', 'DRAFT', 0, "'DRAFT'", '0', 'w.updatedAt') + common + ' WHERE w.draftJson IS NOT NULL',
    projection(personal ? null : 'w.submittedJson', 'RETAINED', 1, personal ? 's.status' : 'w.status', '0', personal ? 's.updatedAt' : 'w.updatedAt') + common + (personal ? ' WHERE s.id IS NOT NULL' : ' WHERE w.submittedJson IS NOT NULL'),
    projection('r.answersJson', 'HISTORY', 2, 'r.action', 'r.revision', 'r.createdAt') + common + (personal ? ' JOIN community_survey_revision r ON r.userId=w.userId AND r.surveyYear=w.surveyYear' : ' JOIN establishment_revision r ON r.surveyId=w.id'),
  ];
  const clauses: string[] = [], values: (string | number)[] = [];
  const condition = (clause: string, ...bound: (string | number)[]) => { clauses.push(clause); values.push(...bound); };
  if (scope !== null) { if (!scope.length) condition('1=0'); else condition('BINARY barangay IN (' + scope.map(() => '?').join(',') + ')', ...scope); }
  if (input.barangay) condition('BINARY barangay=?', input.barangay);
  if (input.year) condition('surveyYear=?', Number(input.year));
  if (input.status) condition('status=?', input.status);
  if (personal && input.employment) condition('category=?', input.employment);
  if (!personal && input.industry) condition('category=?', input.industry);
  if (input.search) {
    if (input.search.length > 180) fail('Search text is too long.');
    const term = '%' + input.search.trim().replace(/[\\%_]/g, '\\$&') + '%';
    condition('(name LIKE ? OR email LIKE ?)', term, term);
  }
  const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
  const cte = 'WITH payloads AS (' + branches.join(' UNION ALL ') + '), visible AS (SELECT *,ROW_NUMBER() OVER (PARTITION BY id ORDER BY priority,revision DESC,changedAt DESC) rn FROM payloads' + where + ') ';
  return prisma.$transaction(async tx => {
    const total = await tx.$queryRawUnsafe<{ n: bigint }[]>(cte + 'SELECT COUNT(*) n FROM visible WHERE rn=1', ...values);
    const items = await tx.$queryRawUnsafe<{ id: string; name: string; email: string; surveyYear: number; status: string; barangay: string | null; category: string | null; view: string }[]>(cte + 'SELECT id,name,email,surveyYear,status,barangay,category,view FROM visible WHERE rn=1 ORDER BY surveyYear DESC,changedAt DESC,id LIMIT ? OFFSET ?', ...values, pageSize, (page - 1) * pageSize);
    return { kind, items, total: Number(total[0].n), page, pageSize };
  }, { isolationLevel: 'RepeatableRead' });
}

async function history(tx: Prisma.TransactionClient, personal: boolean, ownerOrSurvey: string, year: number, scope: string[] | null, input: Filters) {
  const { page, pageSize } = paging(input), table = personal ? 'community_survey_revision' : 'establishment_revision';
  let where = personal ? 'r.userId=? AND r.surveyYear=?' : 'r.surveyId=?';
  const values: (string | number)[] = personal ? [ownerOrSurvey, year] : [ownerOrSurvey];
  if (scope !== null) { where += scope.length ? ' AND BINARY ' + extracted('r.answersJson', 'barangay') + ' IN (' + scope.map(() => '?').join(',') + ')' : ' AND 1=0'; values.push(...scope); }
  const totals = await tx.$queryRawUnsafe<{ n: bigint }[]>('SELECT COUNT(*) n FROM ' + table + ' r WHERE ' + where, ...values);
  const ids = await tx.$queryRawUnsafe<{ id: string }[]>('SELECT r.id FROM ' + table + ' r WHERE ' + where + ' ORDER BY r.revision DESC LIMIT ? OFFSET ?', ...values, pageSize, (page - 1) * pageSize);
  const include = { censusReviews: { orderBy: { createdAt: 'asc' as const }, include: { actor: { select: { name: true } } } } };
  const rows = personal
    ? await tx.communitySurveyRevision.findMany({ where: { id: { in: ids.map(r => r.id) } }, orderBy: { revision: 'desc' }, include })
    : await tx.establishmentRevision.findMany({ where: { id: { in: ids.map(r => r.id) } }, orderBy: { revision: 'desc' }, include });
  return { total: Number(totals[0].n), page, pageSize, items: rows.map(({ censusReviews, ...row }) => ({ ...row, reviews: censusReviews })) };
}
export async function recordDetail(viewer: CivicViewer, kind: string, id: string, input: Filters) {
  const scope = await recordScope(viewer); paging(input);
  return prisma.$transaction(async tx => {
    if (kind === 'INDIVIDUAL') {
      const workspace = await tx.communitySurveyWorkspace.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true } } } });
      if (!workspace) fail('Record not found.', 404);
      const retained = await tx.communitySurvey.findUnique({ where: { userId_surveyYear: { userId: workspace.userId, surveyYear: workspace.surveyYear } } });
      const working = decode(workspace.draftJson);
      const draft = allowed(scope, working) ? working : null;
      const record = allowed(scope, retained as unknown as Answers | null) ? retained : null;
      const revisions = await history(tx, true, workspace.userId, workspace.surveyYear, scope, input);
      if (scope !== null && !draft && !record && !revisions.total) fail('Record is outside your authorized census scope.', 403);
      return { kind, record, workspace: scope === null ? workspace : { id: workspace.id, surveyYear: workspace.surveyYear, user: workspace.user }, draft, history: revisions };
    }
    if (kind !== 'ESTABLISHMENT') fail('Choose record type.');
    const annual = await tx.establishmentSurvey.findUnique({ where: { id }, include: { establishment: { include: { owner: { select: { id: true, name: true, email: true } } } } } });
    if (!annual) fail('Record not found.', 404);
    const working = decode(annual.draftJson), submitted = decode(annual.submittedJson);
    const draft = allowed(scope, working) ? working : null;
    const visibleSubmission = allowed(scope, submitted);
    const revisions = await history(tx, false, id, annual.surveyYear, scope, input);
    if (scope !== null && !draft && !visibleSubmission && !revisions.total) fail('Record is outside your authorized census scope.', 403);
    const record = scope === null ? annual : visibleSubmission ? {
      ...annual, draftJson: draft ? annual.draftJson : null,
      establishment: allowed(scope, annual.establishment as unknown as Answers) ? annual.establishment : null,
    } : null;
    return { kind, record, draft, history: revisions };
  }, { isolationLevel: 'RepeatableRead' });
}
