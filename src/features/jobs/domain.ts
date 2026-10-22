import { CivicError } from "@/features/civic/validation";

export const SKILLS = ["Data entry", "Microsoft Excel", "Microsoft Word", "Customer service", "Communication", "Basic computer", "Troubleshooting", "Bookkeeping", "Cash handling", "Sales", "Food preparation", "Food service", "Inventory", "Driving", "Graphic design", "Social media", "Photography", "Coding", "Agriculture", "Cleaning", "Caregiving", "Teaching", "Construction", "Electrical repair", "Basic Computer Skills", "Microsoft Office", "Data Entry", "Programming", "Web Development", "Graphic Design", "Video Editing", "Social Media Management", "Digital Marketing", "Computer Hardware", "Computer Systems Servicing", "Networking", "Office Administration", "Accounting", "Customer Service", "Inventory Management", "Entrepreneurship", "Business Management", "Electrical Installation", "Welding", "Carpentry", "Plumbing", "Automotive Servicing", "Machine Operation", "Electronics Repair", "Food Preparation", "Baking", "Housekeeping", "Bartending", "Food and Beverage Service", "Tourism", "Beauty Care", "Hairdressing", "Massage / Wellness", "Crop Production", "Animal Production", "Agricultural Machinery", "Organic Agriculture", "Food Processing"] as const;
export const INTERESTS = ["Office & admin", "Technology", "Retail & sales", "Food & hospitality", "Transport", "Creative services", "Healthcare & care", "Education", "Agriculture", "Public service", "Skilled trades"] as const;
export const EDUCATION = ["ANY", "ELEMENTARY", "HIGH_SCHOOL", "SENIOR_HIGH", "VOCATIONAL", "COLLEGE"] as const;
export const WORK_TYPES = ["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP"] as const;
export type WorkType = typeof WORK_TYPES[number];
export const EDUCATION_LABEL: Record<string,string> = { ANY: "Any education", ELEMENTARY:"Elementary", HIGH_SCHOOL:"High school", SENIOR_HIGH:"Senior high school", VOCATIONAL:"Vocational / technical", COLLEGE:"College" };
export const WORK_LABEL: Record<string,string> = { ANY:"Any availability", FULL_TIME:"Full-time", PART_TIME:"Part-time", TEMPORARY:"Temporary", INTERNSHIP:"Internship / SPES" };
export const SECTORS = ["Office & admin", "Technology", "Retail & sales", "Food & hospitality", "Transport", "Creative services", "Healthcare & care", "Education", "Agriculture", "Public service", "Skilled trades"] as const;

function object(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid form data.", 400);
  return value as Record<string,unknown>;
}
function field(value: unknown, name: string, max: number, min = 1): string {
  if (typeof value !== "string") throw new CivicError(`${name} is required.`, 400);
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < min || text.length > max) throw new CivicError(`${name} must contain ${min}–${max} characters.`,400);
  return text;
}
function option(value: unknown, name:string, values:readonly string[]): string {
  if (typeof value !== "string" || !values.includes(value)) throw new CivicError(`Choose a valid ${name}.`,400);
  return value;
}
export function labels(value: unknown, allowed: readonly string[], max = 8): string[] {
  const input = typeof value === "string" ? value.split("|").map(s=>s.trim()) : value;
  if (!Array.isArray(input) || input.length > max || input.some(s=>typeof s!=="string" || !allowed.includes(s))) throw new CivicError("Choose valid skills or interests from the available list.",400);
  return [...new Set(input as string[])];
}
export function parseJob(value:unknown) {
  const d=object(value);
  const externalUrl = d.externalUrl ? field(d.externalUrl,"External posting URL",500) : null;
  if (externalUrl) {
    try { const url = new URL(externalUrl); if (!(["https:","http:"].includes(url.protocol)) || url.username || url.password) throw Error(); }
    catch { throw new CivicError("External posting must be a valid http(s) URL.",400); }
  }
  const expiry = d.expiresAt ? field(d.expiresAt,"Expiry date",10) : "";
  if (expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(Date.parse(`${expiry}T00:00:00Z`)))) throw new CivicError("Enter a valid expiry date.",400);
  const parsed={
    title:field(d.title,"Job title",150,5), employer:field(d.employer,"Employer",150,2),
    sector:option(d.sector,"sector",SECTORS), workType:option(d.workType,"work type",WORK_TYPES),
    barangay:field(d.barangay,"Barangay",100,2), location:field(d.location,"Work location",180,3),
    description:field(d.description,"Description",3000,30),
    skills:labels(d.skills,SKILLS), interests:labels(d.interests,INTERESTS,4),
    education:option(d.education,"education",EDUCATION),
    contactInfo:field(d.contactInfo,"Official application/contact instructions",250,8), externalUrl,
    expiresAt:expiry ? new Date(`${expiry}T23:59:59.000Z`) : null,
    reviewSource:d.reviewSource ? field(d.reviewSource,"Employer/vacancy verification source",300,12) : null,
  };
  if (!parsed.skills.length) throw new CivicError("Select at least one required skill.",400);
  return parsed;
}
export function parseProfile(value:unknown) {
  const d=object(value);
  const skills=labels(d.skills,SKILLS,12);
  const interests=labels(d.interests,INTERESTS,5);
  if (!skills.length && !interests.length) throw new CivicError("Choose at least one skill or interest for suggestions.",400);
  return { skills, interests,
    education:option(d.education,"education",EDUCATION.filter(x=>x!=="ANY")),
    preferredArea:d.preferredArea ? field(d.preferredArea,"Preferred barangay / area",100) : "",
    availability:option(d.availability,"availability",["ANY",...WORK_TYPES]),
  };
}
export function decodeTags(json:string):string[] { try { const v=JSON.parse(json); return Array.isArray(v)?v.filter(x=>typeof x==="string"):[]; } catch { return []; } }
export type MatchProfile = ReturnType<typeof parseProfile>;
export type MatchJob = {skills:string[];interests:string[];workType:string;barangay:string;education:string};
export function scoreMatch(profile:MatchProfile, job:MatchJob) {
  const matchedSkills=job.skills.filter(s=>profile.skills.includes(s));
  const missingSkills=job.skills.filter(s=>!profile.skills.includes(s));
  const matchedInterests=job.interests.filter(s=>profile.interests.includes(s));
  const skillScore=job.skills.length ? Math.round(60*matchedSkills.length/job.skills.length) : 0;
  const interestScore=job.interests.length ? Math.round(20*matchedInterests.length/job.interests.length) : 0;
  const availabilityFit=profile.availability==="ANY" || profile.availability===job.workType;
  const locationFit=Boolean(profile.preferredArea && profile.preferredArea.trim().toLowerCase()===job.barangay.trim().toLowerCase());
  // Suggestions describe overlap, never eligibility or hiring likelihood.
  const score=Math.min(100,skillScore+interestScore+(availabilityFit?10:0)+(locationFit?10:0));
  return {score,matchedSkills,missingSkills,matchedInterests,availabilityFit,locationFit};
}

// RFC 4180-style CSV parser: quoted commas/newlines and escaped double quotes.
// Limited at the HTTP layer and again here; no third-party parser required.
export function parseCsv(text:string):string[][] {
  if (text.length>2_500_000) throw new CivicError("CSV exceeds the 2.5 MB limit.",413);
  const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;
  const input=text.replace(/^\uFEFF/,"");
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"') {if(quoted&&input[i+1]==='"'){cell+='"';i++;}else if(!quoted && !cell){quoted=true;}else if(quoted){quoted=false;}else throw new CivicError("Invalid CSV quoting.",400);}
    else if(c===','&&!quoted){row.push(cell);cell="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";if(rows.length>5002)throw new CivicError("CSV contains too many rows.",400);}
    else cell+=c;
  }
  if(quoted)throw new CivicError("CSV has an unclosed quote.",400);
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
/** Preview-only parser: reject unknown/PII columns outright, but show row-numbered validation errors. */
export function previewSpesCsv(text: string) {
  const rows=parseCsv(text);
  if(rows.length<2) throw new CivicError("CSV needs a header and at least one survey record.",400);
  const heads=rows[0].map(s=>s.trim().toLowerCase());
  const expected=["consent","barangay","education","skills","interests","availability"];
  if(heads.length!==expected.length||heads.some((x,i)=>x!==expected[i])) throw new CivicError("Only these columns are allowed, in order: consent,barangay,education,skills,interests,availability. Remove any names, emails or contact details.",400);
  if(rows.length>501)throw new CivicError("Import up to 500 survey records at a time.",400);
  const records: ReturnType<typeof parseSpesCsv>=[];
  const errors:{row:number;message:string}[]=[];
  for(let i=1;i<rows.length;i++) {
    try {
      const row=rows[i];
      if(row.length!==6)throw new CivicError("Expected six columns.",400);
      if(row[0].trim().toUpperCase()!=="YES")throw new CivicError("Missing explicit YES consent; row will not be imported.",400);
      const education=option(row[2].trim().toUpperCase(),"education",EDUCATION.filter(x=>x!=="ANY"));
      const availability=option(row[5].trim().toUpperCase(),"availability",["ANY",...WORK_TYPES]);
      const barangay=field(row[1],"Barangay",100,2);
      const skills=labels(row[3],SKILLS,12);
      const interests=labels(row[4],INTERESTS,5);
      records.push({barangay,education,skills,interests,availability});
    }catch(error){errors.push({row:i+1,message:error&&typeof error==="object"&&"message" in error&&typeof error.message==="string"?error.message:"Invalid survey row."});}
  }
  // Errors carry row numbers and schema messages only, never raw user-provided values.
  return {records,errors,totalRows:rows.length-1};
}

export function parseSpesCsv(text:string) {
  const rows=parseCsv(text);
  if(rows.length<2)throw new CivicError("CSV needs a header and at least one consented survey record.",400);
  const heads=rows[0].map(s=>s.trim().toLowerCase());
  const expected=["consent","barangay","education","skills","interests","availability"];
  // Strict schema blocks accidental upload of names, phones, email and other identifiers.
  if(heads.length!==expected.length || heads.some((x,i)=>x!==expected[i]))throw new CivicError("Only these columns are allowed, in order: consent,barangay,education,skills,interests,availability. Remove any names, emails or contact details.",400);
  const records=rows.slice(1).map((row,i)=>{
    if(row.length!==6)throw new CivicError(`CSV row ${i+2} has the wrong number of columns.`,400);
    if(row[0].trim().toUpperCase()!=="YES")throw new CivicError(`CSV row ${i+2} has no explicit YES consent. Do not import this record.`,400);
    const education=option(row[2].trim().toUpperCase(),"education",EDUCATION.filter(x=>x!=="ANY"));
    const availability=option(row[5].trim().toUpperCase(),"availability",["ANY",...WORK_TYPES]);
    return {barangay:field(row[1],"Barangay",100,2),education,
      skills:labels(row[3],SKILLS,12),interests:labels(row[4],INTERESTS,5),availability};
  });
  if(records.length>500)throw new CivicError("Import up to 500 consented records.",400);
  return records;
}
