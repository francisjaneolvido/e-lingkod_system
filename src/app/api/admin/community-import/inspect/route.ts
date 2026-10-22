import { requireApiViewer } from "@/lib/access";
import { assertSameOrigin, readMultipart, json, apiFailure } from "@/features/civic/server/http";
import { parseUploadedTable } from "@/features/community/server/import-file";
export async function POST(request:Request){try{assertSameOrigin(request);await requireApiViewer(request,"COMMUNITY_DATA");const form=await readMultipart(request,2_700_000);const table=await parseUploadedTable(form);return json({headers:table.headers,totalRows:table.rows.length,fileType:table.fileType,sourceFilename:table.sourceFilename,sampleRows:table.rows.slice(0,5).map(row=>table.headers.map((_,i)=>String(row[i]||"").slice(0,120)))});}catch(error){return apiFailure(error);}}
