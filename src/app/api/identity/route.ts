import {viewerFromHeaders} from '@/lib/access';
import {CivicError} from '@/features/civic/validation';
import {apiFailure,assertSameOrigin,json,readMultipart} from '@/features/civic/server/http';
import {identityDetail,submitIdentity} from '@/features/identity/server';

export async function GET(request: Request) {
  try {
    const viewer=await viewerFromHeaders(request.headers);
    if(!viewer)throw new CivicError('Please sign in to view verification status.',401);
    return json(await identityDetail(viewer.id,viewer));
  } catch(error){return apiFailure(error);}
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const viewer=await viewerFromHeaders(request.headers);
    if(!viewer)throw new CivicError('Please sign in to submit your ID.',401);
    if(viewer.role!=='CITIZEN')throw new CivicError('Only Citizen accounts submit IDs for review.',403);
    const result=await submitIdentity(await readMultipart(request,5*1024*1024+16_384),viewer);
    return json({success:true,...result},result.replayed?200:201);
  } catch(error){return apiFailure(error);}
}
