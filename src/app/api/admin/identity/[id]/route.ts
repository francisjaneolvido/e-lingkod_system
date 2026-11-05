import {requireApiViewer} from '@/lib/access';
import {apiFailure,assertSameOrigin,json,readJson} from '@/features/civic/server/http';
import {reviewIdentity} from '@/features/identity/server';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    assertSameOrigin(request);
    const viewer=await requireApiViewer(request,true);
    const {id}=await params;
    return json({success:true,...await reviewIdentity(id,await readJson(request),viewer)});
  }catch(error){return apiFailure(error);}
}
