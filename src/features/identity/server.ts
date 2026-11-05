import 'server-only';
import {prisma} from '@/lib/prisma';
import type {CivicViewer} from '@/features/civic/types';
import {CivicError} from '@/features/civic/validation';
import {canSubmitIdentity, IDENTITY_STATES} from './policy';
import {validateIdentityDocument} from './document';

const metadata = {id:true, revision:true, documentLabel:true, detailsJson:true, mimeType:true, byteSize:true, sha256:true, submittedAt:true,
  reviews:{select:{id:true,decision:true,reason:true,reviewedAt:true,reviewer:{select:{id:true,name:true}}}}} as const;
const userDetails = {id:true,name:true,email:true,firstName:true,lastName:true,middleInitial:true,hasNoMiddleName:true,phoneNumber:true,role:true,emailVerified:true,identityStatus:true,identityVersion:true,createdAt:true} as const;

function version(value: unknown) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 0) throw new CivicError('Refresh the verification page and try again.');
  return number;
}

async function administrator(viewer: CivicViewer) {
  const user = await prisma.user.findUnique({where:{id:viewer.id},select:{role:true}});
  if (user?.role !== 'ADMIN') throw new CivicError('Super Admin access is required.',403);
}

export async function identityDetail(userId: string, viewer: CivicViewer) {
  if (viewer.id !== userId) await administrator(viewer);
  // Keep byte data outside React props and ordinary JSON responses.
  const details = await prisma.user.findUnique({where:{id:userId},select:userDetails});
  if (!details) throw new CivicError('Account not found.',404);
  const submissions = await prisma.citizenIdentitySubmission.findMany({where:{userId},select:metadata,orderBy:{revision:'desc'}});
  return {...details,submissions};
}

export async function submitIdentity(form: FormData, viewer: CivicViewer) {
  const expectedVersion = version(form.get('expectedVersion'));
  const key = String(form.get('submissionKey') || '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) throw new CivicError('Refresh this page before submitting the ID.');
  const label = String(form.get('documentLabel') || '').trim();
  if (label.length < 3 || label.length > 120 || /[\u0000-\u001f]/.test(label)) throw new CivicError('Describe the identity document in 3–120 characters.');
  const file = form.get('file');
  if (!(file instanceof File)) throw new CivicError('Choose a JPG or PNG image of your ID.');
  const image = await validateIdentityDocument(file);
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({where:{id:viewer.id},select:userDetails});
    if (!user || user.role !== 'CITIZEN') throw new CivicError('Only Citizen accounts submit IDs for review.',403);
    const prior = await tx.citizenIdentitySubmission.findUnique({where:{userId_submissionKey:{userId:viewer.id,submissionKey:key}},select:{id:true,sha256:true,documentLabel:true,revision:true}});
    if (prior) {
      if (prior.sha256 !== image.sha256 || prior.documentLabel !== label || prior.revision !== expectedVersion+1) throw new CivicError('This upload retry contains different details. Refresh the page.',409);
      return {id:prior.id,replayed:true};
    }
    if (!canSubmitIdentity(user.identityStatus) || user.identityVersion !== expectedVersion) throw new CivicError('Your verification details changed. Refresh the page before submitting.',409);
    const claimed = await tx.user.updateMany({where:{id:viewer.id,role:'CITIZEN',identityVersion:expectedVersion,identityStatus:user.identityStatus},data:{identityStatus:'PENDING',identityVersion:{increment:1}}});
    if (claimed.count !== 1) throw new CivicError('Another submission or review changed this account. Refresh the page.',409);
    const detailsJson=JSON.stringify({name:user.name,firstName:user.firstName,lastName:user.lastName,middleInitial:user.middleInitial,hasNoMiddleName:user.hasNoMiddleName,email:user.email,phoneNumber:user.phoneNumber});
    const row = await tx.citizenIdentitySubmission.create({data:{userId:viewer.id,revision:expectedVersion+1,submissionKey:key,documentLabel:label,detailsJson,...image}});
    return {id:row.id,replayed:false};
  });
}

export async function reviewIdentity(submissionId: string, input: unknown, viewer: CivicViewer) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CivicError('Choose a review decision.');
  const body = input as Record<string,unknown>;
  const expectedVersion = version(body.expectedVersion);
  const decision = String(body.decision || '');
  if (!['APPROVED','CORRECTIONS_REQUIRED','REJECTED'].includes(decision)) throw new CivicError('Choose approve, request corrections or reject.');
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 8 || reason.length > 1200) throw new CivicError('Enter a clear review reason in 8–1200 characters.');
  return prisma.$transaction(async tx => {
    const actor = await tx.user.findUnique({where:{id:viewer.id},select:{role:true}});
    if (actor?.role !== 'ADMIN') throw new CivicError('Super Admin access is required.',403);
    const submission = await tx.citizenIdentitySubmission.findUnique({where:{id:submissionId},select:{id:true,userId:true,revision:true}});
    if (!submission) throw new CivicError('Submission not found.',404);
    if (submission.revision !== expectedVersion) throw new CivicError('This is an older document revision. Refresh the review.',409);
    const claimed = await tx.user.updateMany({where:{id:submission.userId,role:'CITIZEN',identityStatus:'PENDING',identityVersion:expectedVersion},data:{identityStatus:decision,identityVersion:{increment:1}}});
    if (claimed.count !== 1) throw new CivicError('This submission has already changed or been reviewed. Refresh the review.',409);
    const review = await tx.citizenIdentityReview.create({data:{submissionId,reviewerId:viewer.id,decision,reason}});
    return {id:review.id};
  });
}

export async function identityDocument(id: string, viewer: CivicViewer) {
  const row = await prisma.citizenIdentitySubmission.findUnique({where:{id},select:{userId:true,mimeType:true,data:true}});
  if (!row) throw new CivicError('Document not found.',404);
  if (row.userId !== viewer.id) {
    const actor = await prisma.user.findUnique({where:{id:viewer.id},select:{role:true}});
    if (actor?.role !== 'ADMIN') throw new CivicError('Document not found.',404);
  }
  return row;
}

export async function identityQueue(input: {status?:string;page?:number;q?:string}, viewer: CivicViewer) {
  await administrator(viewer);
  const status = input.status || 'PENDING';
  if (status !== 'ALL' && !(IDENTITY_STATES as readonly string[]).includes(status)) throw new CivicError('Choose a valid verification status.');
  const page = Number.isSafeInteger(input.page) && input.page! > 0 ? Math.min(input.page!,10000) : 1;
  const q = (input.q || '').trim().slice(0,80);
  const where = {role:'CITIZEN',...(status==='ALL'?{}:{identityStatus:status}),...(q?{OR:[{name:{contains:q}},{email:{contains:q}}]}:{})};
  const [rows,total,counts] = await Promise.all([
    prisma.user.findMany({where,select:{...userDetails,identitySubmissions:{take:1,orderBy:{revision:'desc'},select:metadata}},orderBy:[{updatedAt:'desc'},{id:'desc'}],take:20,skip:(page-1)*20}),
    prisma.user.count({where}),prisma.user.groupBy({by:['identityStatus'],where:{role:'CITIZEN'},_count:{_all:true}}),
  ]);
  return {rows,total,page,pages:Math.max(1,Math.ceil(total/20)),status,q,totals:Object.fromEntries(counts.map(row=>[row.identityStatus,row._count._all]))};
}
