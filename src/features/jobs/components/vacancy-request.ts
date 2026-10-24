export type PreparedVacancyRequest = {
 signature:string;
 path:string;
 method:'POST'|'PATCH';
 body:Record<string,unknown>;
 resultVersion:number;
};

export class VacancyRequestError extends Error {
 constructor(message:string,readonly definitiveRejection=false){super(message);}
}

// An unreadable response does not establish whether the transaction committed.
export async function sendPreparedVacancy(request:PreparedVacancyRequest){
 const response=await fetch(request.path,{method:request.method,headers:{'Content-Type':'application/json'},body:JSON.stringify(request.body)});
 let parsed:unknown;
 try{parsed=await response.json();}catch{throw new VacancyRequestError('Unable to confirm the vacancy save. Retry to reconcile the original request.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new VacancyRequestError('Unable to confirm the saved vacancy. Retry the original request.');
 const result=parsed as Record<string,unknown>;
 if(!response.ok){
  // Validation errors are pre-mutation/rollback responses. Permission/conflict
  // errors can follow a lost committed response, so keep those unresolved keys.
  throw new VacancyRequestError(typeof result.error==='string'?result.error:'Unable to save opportunity.',[400,422].includes(response.status)&&typeof result.error==='string');
 }
 if(typeof result.id!=='string'||!result.id)throw new VacancyRequestError('Unable to confirm the saved vacancy. Retry the original request.');
 // CREATE starts at 1; EDIT advances its prepared expected version once. This
 // receipt version is deliberately not replaced by a later, unseen row version.
 return {id:result.id,status:result.status,version:request.resultVersion};
}
