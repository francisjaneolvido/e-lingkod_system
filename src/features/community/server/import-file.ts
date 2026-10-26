import "server-only";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { CivicError } from "@/features/civic/validation";
import { IMPORT_FIELDS, type ImportField, normalizeImportedStatus, splitImported } from "../domain";
import { parseCsv } from "@/features/jobs/domain";

export type ParsedTable={headers:string[];rows:string[][];fileType:"CSV"|"XLSX";sourceFilename:string;sourceRowNumbers?:number[];headerRowNumber?:number};
export type ImportedAnalyticalRecord={
 originalRowNumber:number;participantRef:string|null;barangay:string|null;ageGroup:string|null;educationLevel:string|null;employmentStatus:string|null;occupation:string|null;industry:string|null;skills:string[];trainingInterest:string|null;trainingCategories:string[];trainingPrograms:string[];trainingBarriers:string[];employmentBarriers:string[];businessSector:string|null;assistanceNeeded:string[];raw:Record<string,string>;qualityFlags:string[];
};

function xmlDecode(value:string){return value.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}
function zipEntries(buffer:Buffer):Map<string,Buffer>{
 const invalid=():never=>{throw new CivicError("Invalid or oversized XLSX archive.",400);};
 if(buffer.length<22)invalid();let eocd=-1;
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)invalid();const count=buffer.readUInt16LE(eocd+10),directorySize=buffer.readUInt32LE(eocd+12);let offset=buffer.readUInt32LE(eocd+16),expanded=0;
 if(count>256||buffer.readUInt16LE(eocd+4)!==0||buffer.readUInt16LE(eocd+6)!==0||offset+directorySize>eocd)invalid();
 const out=new Map<string,Buffer>();
 for(let i=0;i<count;i++){
  if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)invalid();
  const flags=buffer.readUInt16LE(offset+8),method=buffer.readUInt16LE(offset+10),compressedSize=buffer.readUInt32LE(offset+20),size=buffer.readUInt32LE(offset+24),nameLen=buffer.readUInt16LE(offset+28),extraLen=buffer.readUInt16LE(offset+30),commentLen=buffer.readUInt16LE(offset+32),localOffset=buffer.readUInt32LE(offset+42);
  if(flags&1||![0,8].includes(method)||size>8_000_000||expanded+size>20_000_000||offset+46+nameLen+extraLen+commentLen>eocd||localOffset+30>buffer.length)invalid();
  const name=buffer.subarray(offset+46,offset+46+nameLen).toString('utf8');if(!name||name.includes('..')||name.startsWith('/')||name.includes('\\')||out.has(name))invalid();
  if(buffer.readUInt32LE(localOffset)!==0x04034b50)invalid();
  const dataStart=localOffset+30+buffer.readUInt16LE(localOffset+26)+buffer.readUInt16LE(localOffset+28);if(dataStart+compressedSize>offset||dataStart>offset)invalid();
  let data:Buffer;try{const compressed=buffer.subarray(dataStart,dataStart+compressedSize);data=method===0?Buffer.from(compressed):inflateRawSync(compressed,{maxOutputLength:8_000_000});}catch{invalid();}
  if(data!.length!==size)invalid();expanded+=data!.length;out.set(name,data!);offset+=46+nameLen+extraLen+commentLen;
 }
 return out;
}
function cellColumn(ref:string){const letters=(ref.match(/[A-Z]+/i)?.[0]||"A").toUpperCase();let n=0;for(const c of letters)n=n*26+(c.charCodeAt(0)-64);return n-1;}
function parseXlsx(buffer:Buffer):{rows:string[][];coordinates:number[]}{
 const entries=zipEntries(buffer);for(const value of entries.values())if(/<!DOCTYPE|<!ENTITY/i.test(value.toString("utf8")))throw new CivicError("XLSX external entities are unsupported.",400);const sharedXml=entries.get("xl/sharedStrings.xml")?.toString("utf8")||"";const shared:string[]=[];
 if(sharedXml){for(const m of sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){const texts=[...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1].replace(/<[^>]+>/g,"")));shared.push(texts.join(""));}}
 const sheetName=[...entries.keys()].filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];if(!sheetName)throw new CivicError("The XLSX file has no readable worksheet.",400);const xml=entries.get(sheetName)!.toString("utf8");const rows:string[][]=[],coordinates:number[]=[];let previous=0;
 for(const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)){
  const body=rm[2]||"", declared=/\br="(\d+)"/.exec(rm[1])?.[1], first=/\br="[A-Z]+(\d+)"/.exec(body)?.[1];
  const coordinate=Number(declared||first||previous+1);
  if(!Number.isInteger(coordinate)||coordinate<=previous||coordinate>1048576)throw new CivicError("Invalid XLSX worksheet row coordinates.",400);previous=coordinate;
  const row:string[]=[];for(const cm of body.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){const attrs=cm[1],body=cm[2],ref=/\br="([^"]+)"/.exec(attrs)?.[1]||"A1",type=/\bt="([^"]+)"/.exec(attrs)?.[1]||"";let value="";if(type==="inlineStr"){value=[...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");}else{const raw=/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]||"";value=type==="s"?shared[Number(raw)]||"":xmlDecode(raw);}if(ref&&Number(/\d+$/.exec(ref)?.[0])!==coordinate)throw new CivicError("XLSX cell and row coordinates disagree.",400);const column=cellColumn(ref);if(column>=100||value.length>500)throw new CivicError("XLSX columns or cell size exceed limits.",400);row[column]=value.trim();}
  if(row.some(Boolean)){rows.push(Array.from(row,v=>v||""));coordinates.push(coordinate);}if(rows.length>5001)throw new CivicError("Import up to 5,000 records at a time.",400);
 }
 return {rows,coordinates};
}

export async function parseUploadedTable(form:FormData):Promise<ParsedTable>{
 const file=form.get("file");if(!(file instanceof File)||file.size===0)throw new CivicError("Choose a CSV or XLSX file.",400);if(file.size>2_500_000)throw new CivicError("Import files are limited to 2.5 MB.",413);
 const name=file.name.slice(0,220),lower=name.toLowerCase();let rows:string[][];let coordinates:number[]|undefined;let fileType:"CSV"|"XLSX";
 if(lower.endsWith(".csv")){fileType="CSV";rows=parseCsv(Buffer.from(await file.arrayBuffer()).toString("utf8"));}
 else if(lower.endsWith(".xlsx")){fileType="XLSX";const parsed=parseXlsx(Buffer.from(await file.arrayBuffer()));rows=parsed.rows;coordinates=parsed.coordinates;}
 else throw new CivicError("Only .csv and .xlsx files are supported.",400);
 if(rows.length<2)throw new CivicError("The file needs a header row and at least one data row.",400);if(rows.length>5001)throw new CivicError("Import up to 5,000 records at a time.",400);
 if(rows[0].length>100)throw new CivicError("Import at most 100 columns.",400);const headers=rows[0].map((h,i)=>h.trim()||`Column ${i+1}`);return {headers,rows:rows.slice(1),fileType,sourceFilename:name,...(coordinates?{sourceRowNumbers:coordinates.slice(1),headerRowNumber:coordinates[0]}:{})};
}
function text(value:string|undefined,max=180):string|null{const v=(value||"").trim().replace(/\s+/g," ");return v?v.slice(0,max):null;}
function normalizeEducation(value:string):string|null{const v=value.trim().toLowerCase().replace(/[^a-z0-9]+/g," ");const map:Record<string,string>={elementary:"ELEMENTARY","high school":"HIGH_SCHOOL","secondary":"HIGH_SCHOOL","senior high":"SENIOR_HIGH","senior high school":"SENIOR_HIGH","shs":"SENIOR_HIGH",vocational:"VOCATIONAL","technical vocational":"VOCATIONAL","tesda":"VOCATIONAL",college:"COLLEGE",graduate:"COLLEGE",postgraduate:"POSTGRADUATE","post graduate":"POSTGRADUATE"};return map[v]||null;}
function normalizeTrainingInterest(value:string):string|null{const v=value.trim().toLowerCase();if(["yes","y","interested"].includes(v))return "YES";if(["maybe","possibly"].includes(v))return "MAYBE";if(["no","n"].includes(v))return "NO";if(["not now","not at the moment"].includes(v))return "NOT_NOW";return null;}
function normalizeAge(value:string):string|null{const v=value.trim();if(["15-17","18-24","25-34","35-44","45-54","55-64","65+"].includes(v))return v;const age=Number(v);if(Number.isFinite(age)){if(!Number.isInteger(age)||age<15||age>120)return null;if(age>=15&&age<=17)return"15-17";if(age<=24)return"18-24";if(age<=34)return"25-34";if(age<=44)return"35-44";if(age<=54)return"45-54";if(age<=64)return"55-64";if(age>=65&&age<=120)return"65+";}return null;}
export function parseMapping(raw:FormDataEntryValue|null,headerCount:number):Record<number,ImportField>{
 if(typeof raw!=="string")throw new CivicError("Column mapping is required.",400);let v:unknown;try{v=JSON.parse(raw);}catch{throw new CivicError("Column mapping is invalid.",400);}if(!v||typeof v!=="object"||Array.isArray(v))throw new CivicError("Column mapping is invalid.",400);const out:Record<number,ImportField>={};
 for(const [key,value] of Object.entries(v as Record<string,unknown>)){const i=Number(key);if(!Number.isInteger(i)||i<0||i>=headerCount||typeof value!=="string"||!IMPORT_FIELDS.includes(value as ImportField))continue;out[i]=value as ImportField;}
 if(!Object.values(out).some(v=>v!=="IGNORE"))throw new CivicError("Map at least one analytical column before previewing.",400);return out;
}
export function mapRows(table:ParsedTable,mapping:Record<number,ImportField>){
 const records:ImportedAnalyticalRecord[]=[];const issues:{row:number;message:string}[]=[];const refs=new Map<string,number>();
 table.rows.forEach((row,index)=>{const raw:Record<string,string>={};const get=(field:ImportField)=>{const i=Object.entries(mapping).find(([,f])=>f===field)?.[0];return i===undefined?"":String(row[Number(i)]||"").trim();};for(const [key,field] of Object.entries(mapping)){if(field!=="IGNORE")raw[field]=String(row[Number(key)]||"").trim().slice(0,500);}
  const flags:string[]=[];const statusRaw=get("employmentStatus"),educationRaw=get("educationLevel"),ageRaw=get("ageGroup"),trainingRaw=get("trainingInterest");const employmentStatus=statusRaw?normalizeImportedStatus(statusRaw):null,educationLevel=educationRaw?normalizeEducation(educationRaw):null,ageGroup=ageRaw?normalizeAge(ageRaw):null,trainingInterest=trainingRaw?normalizeTrainingInterest(trainingRaw):null;
  if(statusRaw&&!employmentStatus)flags.push("Unrecognized employment status");if(educationRaw&&!educationLevel)flags.push("Unrecognized education level");if(ageRaw&&!ageGroup)flags.push("Unrecognized age/age group");if(trainingRaw&&!trainingInterest)flags.push("Unrecognized training interest");
  const participantRef=text(get("participantRef"),191);if(participantRef){refs.set(participantRef,(refs.get(participantRef)||0)+1);}
  const record:ImportedAnalyticalRecord={originalRowNumber:table.sourceRowNumbers?.[index]??index+2,participantRef,barangay:text(get("barangay"),100),ageGroup,educationLevel,employmentStatus,occupation:text(get("occupation"),150),industry:text(get("industry"),120),skills:splitImported(get("skills")),trainingInterest,trainingCategories:splitImported(get("trainingCategories")),trainingPrograms:splitImported(get("trainingPrograms")),trainingBarriers:splitImported(get("trainingBarriers")),employmentBarriers:splitImported(get("employmentBarriers")),businessSector:text(get("businessSector"),120),assistanceNeeded:splitImported(get("assistanceNeeded")),raw,qualityFlags:flags};
  const useful=[record.barangay,record.ageGroup,record.educationLevel,record.employmentStatus,record.occupation,record.industry,record.businessSector,...record.skills,...record.trainingPrograms].some(Boolean);if(!useful){issues.push({row:table.sourceRowNumbers?.[index]??index+2,message:"No usable analytical value after mapping."});return;}records.push(record);
 });
 let duplicateCount=0;for(const count of refs.values())if(count>1)duplicateCount+=count-1;return {records,issues,duplicateCount,warningCount:records.reduce((n,r)=>n+r.qualityFlags.length,0)};
}
export function importFingerprint(records:ImportedAnalyticalRecord[],meta:string){const compact=records.map(r=>({p:r.participantRef,b:r.barangay,a:r.ageGroup,e:r.employmentStatus,s:r.skills,t:r.trainingPrograms}));return createHash("sha256").update(JSON.stringify({meta,compact})).digest("hex");}
