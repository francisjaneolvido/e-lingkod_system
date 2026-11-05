import {viewerFromHeaders} from '@/lib/access';
import {identityDocument} from '@/features/identity/server';
import {CivicError} from '@/features/civic/validation';
import {apiFailure} from '@/features/civic/server/http';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const viewer=await viewerFromHeaders(request.headers);
    if(!viewer)throw new CivicError('Please sign in to view your ID.',401);
    const {id}=await params;
    const document=await identityDocument(id,viewer);
    return new Response(new Uint8Array(document.data),{headers:{
      'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="identity-document.jpg"',
      'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer',
      'Cross-Origin-Resource-Policy':'same-origin',
    }});
  }catch(error){return apiFailure(error);}
}
