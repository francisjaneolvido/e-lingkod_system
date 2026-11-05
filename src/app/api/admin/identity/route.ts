import {requireApiViewer} from '@/lib/access';
import {apiFailure,json} from '@/features/civic/server/http';
import {identityQueue} from '@/features/identity/server';

export async function GET(request:Request) {
  try {
    const viewer=await requireApiViewer(request,true);
    const params=new URL(request.url).searchParams;
    return json(await identityQueue({status:params.get('status')||undefined,q:params.get('q')||undefined,page:Number(params.get('page')||1)},viewer));
  }catch(error){return apiFailure(error);}
}
