import {CivicError} from '@/features/civic/validation';
export const PAY_BASES=['HOUR','DAY','MONTH','YEAR'] as const;
// Supported currencies, not a claim to list every ISO currency.
export const PAY_CURRENCIES=['PHP','USD','EUR','GBP','JPY','AUD','CAD','SGD'] as const;
export const ARRANGEMENTS=['ON_SITE','HYBRID','REMOTE'] as const;
export const EXPERIENCE_LEVELS=['NONE_REQUIRED','ENTRY_LEVEL','EXPERIENCED'] as const;
export const OCCUPATIONS=['Food & Hospitality','IT','Administrative','Healthcare','Education','Public Service','Skilled trades','Agriculture','Transport','Retail & Sales','Other'] as const;
export const EMPLOYMENT_SECTORS=['GOVERNMENT','PRIVATE','NONPROFIT'] as const;
function fail(message:string):never{throw new CivicError(message,400);}
const norm=(value:unknown)=>typeof value==='string'?value.normalize('NFKC').trim().toUpperCase():'';
const missing=(value:unknown)=>value===undefined||value===null||value==='';
export function amount(raw:unknown):string|null{
 if(missing(raw))return null;
 if(typeof raw!=='number'&&typeof raw!=='string')return fail('Enter a valid pay amount.');
 const value=String(raw);if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(value))return fail('Pay must be a nonnegative amount with at most two decimal places.');
 return Number(value).toFixed(2);
}
export function parsePay(input:Record<string,unknown>,required=false){
 const payMin=amount(input.payMin),payMax=amount(input.payMax);
 const payCurrency=missing(input.payCurrency)?null:String(input.payCurrency),payBasis=missing(input.payBasis)?null:String(input.payBasis);
 if(input.negotiable!==undefined&&typeof input.negotiable!=='boolean')fail('Negotiability must be true or false.');
 const negotiable=input.negotiable===true;
 if([payMin,payMax,payCurrency,payBasis].some(v=>v!==null)){
  if(payMin===null||payMax===null||payCurrency===null||payBasis===null)fail('Disclose both pay amounts, currency and pay basis.');
  if(!PAY_CURRENCIES.includes(payCurrency as never)||!PAY_BASES.includes(payBasis as never))fail('Choose a supported currency and pay basis.');
  if(Number(payMin)>Number(payMax))fail('Minimum pay cannot exceed maximum pay.');
 }else if(required||negotiable)fail('Provide pay amounts, currency and pay basis; negotiability alone does not disclose compensation.');
 return {payMin,payMax,payCurrency,payBasis,negotiable};
}
export function parseVacancyDetails(input:Record<string,unknown>,publication=false){
 const option=(key:string,values:readonly string[])=>{if(missing(input[key]))return null;if(typeof input[key]!=='string'||!values.includes(input[key] as string))fail('Choose a valid '+key+'.');return input[key] as string;};
 const certificates=input.certifications;
 if(certificates!==undefined&&certificates!==null&&(!Array.isArray(certificates)||certificates.length>20||certificates.some(s=>typeof s!=='string'||!s.trim()||s.length>100)))fail('List valid required certifications (up to20).');
 if(input.isDemo!==undefined&&typeof input.isDemo!=='boolean')fail('Demonstration flag must be true or false.');
 return {...parsePay(input,publication),occupationCategory:option('occupationCategory',OCCUPATIONS),employmentSector:option('employmentSector',EMPLOYMENT_SECTORS),workArrangement:option('workArrangement',ARRANGEMENTS),experienceLevel:option('experienceLevel',EXPERIENCE_LEVELS),certificationsJson:certificates==null?null:JSON.stringify([...new Set((certificates as string[]).map(s=>s.normalize('NFKC').trim()))]),isDemo:input.isDemo===true};
}
export type Opportunity={id:string;title:string;employer?:string;status?:string;sector:string;employmentSector?:string|null;workType:string;barangay:string;location:string;skills:string[];education:string;publishedAt:string|null;expiresAt:string|null;occupationCategory?:string|null;workArrangement?:string|null;experienceLevel?:string|null;certifications?:string[]|null;payMin?:string|null;payMax?:string|null;payCurrency?:string|null;payBasis?:string|null;negotiable?:boolean|null;isDemo?:boolean};
export type OpportunityProfile={skills:string[];qualifications:string[];education?:string|null;preferredOccupations:string[];occupation?:string|null;preferredArea?:string|null;workType?:string|null;workArrangement?:string|null;experienceLevel?:string|null;trainingInterest?:boolean|null;trainingPrograms?:string[];employmentBarriers?:string[]};
export type OpportunityFilters=Partial<Record<'q'|'location'|'barangay'|'occupation'|'skill'|'type'|'arrangement'|'education'|'experience'|'currency'|'basis'|'minPay'|'maxPay'|'negotiable'|'sector'|'posted'|'certification',string>>;
const keys=['q','location','barangay','occupation','skill','type','arrangement','education','experience','currency','basis','minPay','maxPay','negotiable','sector','posted','certification'];
export function parseOpportunityFilters(raw:URLSearchParams|Record<string,unknown>):OpportunityFilters{
 const entries=raw instanceof URLSearchParams?[...raw.entries()]:Object.entries(raw),result:Record<string,string>={},seen=new Set<string>();
 for(const [key,value] of entries){if(!keys.includes(key)||seen.has(key)||typeof value!=='string'||value.length>150)fail('Invalid, repeated or unsupported opportunity filter.');seen.add(key);if(value.trim())result[key]=value.normalize('NFKC').trim();}
 const options:Record<string,readonly string[]>={type:['FULL_TIME','PART_TIME','CONTRACTUAL','PROJECT_BASED','TEMPORARY','INTERNSHIP'],arrangement:ARRANGEMENTS,education:['ANY','ELEMENTARY','HIGH_SCHOOL','SENIOR_HIGH','VOCATIONAL','COLLEGE'],experience:EXPERIENCE_LEVELS,currency:PAY_CURRENCIES,basis:PAY_BASES,negotiable:['true','false'],sector:['GOVERNMENT','PRIVATE','NONPROFIT'],posted:['1','7','30']};
 for(const [key,values] of Object.entries(options))if(result[key]&&!values.includes(result[key]))fail('Choose a valid '+key+' filter.');
 if((result.minPay||result.maxPay)&&(!result.currency||!result.basis))fail('Choose currency and pay basis before comparing pay.');
 if((result.currency&&!result.basis)||(result.basis&&!result.currency))fail('Currency and pay basis must be selected together.');
 for(const key of ['minPay','maxPay'])if(result[key])result[key]=amount(result[key])!;
 if(result.minPay&&result.maxPay&&Number(result.minPay)>Number(result.maxPay))fail('Minimum filter pay exceeds maximum.');
 return result;
}
export function activeOpportunity(job:Opportunity,now=new Date()) {return (!job.status||job.status==='PUBLISHED')&&(!job.expiresAt||Date.parse(job.expiresAt)>now.getTime());}
export function filterOpportunities<T extends Opportunity>(jobs:T[],f:OpportunityFilters,now=new Date()):T[]{return jobs.filter(j=>{
 if(!activeOpportunity(j,now))return false;
 if(f.q&&!norm([j.title,j.employer,j.location].join(' ')).includes(norm(f.q)))return false;
 if(f.location&&!norm(j.location).includes(norm(f.location)))return false;
 for(const [filter,key] of [['barangay','barangay'],['occupation','occupationCategory'],['type','workType'],['arrangement','workArrangement'],['education','education'],['experience','experienceLevel']] as const)if(f[filter]&&norm(j[key])!==norm(f[filter]))return false;
 if(f.sector&&norm(j.employmentSector??j.sector)!==norm(f.sector))return false;
 for(const [filter,values] of [['skill',j.skills],['certification',j.certifications||[]]] as const)if(f[filter]&&!values.some(v=>norm(v)===norm(f[filter])))return false;
 if(f.negotiable&&(j.payMin==null||j.payMax==null||String(j.negotiable===true)!==f.negotiable))return false;
 if(f.currency&&(j.payCurrency!==f.currency||j.payBasis!==f.basis||j.payMin==null||j.payMax==null))return false;
 if(f.minPay&&(j.payMax==null||Number(j.payMax)<Number(f.minPay)))return false;
 if(f.maxPay&&(j.payMin==null||Number(j.payMin)>Number(f.maxPay)))return false;
 if(f.posted&&(!j.publishedAt||Date.parse(j.publishedAt)>now.getTime()||Date.parse(j.publishedAt)<now.getTime()-Number(f.posted)*86400000))return false;
 return true;
}).sort((a,b)=>Date.parse(b.publishedAt||'0')-Date.parse(a.publishedAt||'0')||a.id.localeCompare(b.id,'en'));}
const educationOrder=['ANY','ELEMENTARY','HIGH_SCHOOL','SENIOR_HIGH','VOCATIONAL','COLLEGE','POSTGRADUATE'];
export function qualificationGaps(job:Opportunity,p:OpportunityProfile){
 const gaps:string[]=[];const required=educationOrder.indexOf(job.education),actual=educationOrder.indexOf(p.education||'');
 if(job.education!=='ANY'&&(required<0||actual<required))gaps.push('Education: '+job.education+' required; qualification not established.');
 for(const certificate of job.certifications||[])if(!p.qualifications.some(q=>norm(q)===norm(certificate)))gaps.push('Certification not recorded: '+certificate);
 if(job.experienceLevel==='EXPERIENCED'&&p.experienceLevel!=='EXPERIENCED')gaps.push('Experienced work requirement not established.');
 if(job.experienceLevel==='ENTRY_LEVEL'&&!['ENTRY_LEVEL','EXPERIENCED'].includes(p.experienceLevel||''))gaps.push('Work experience not recorded.');
 return gaps;
}
export function rankOpportunities<T extends Opportunity>(jobs:T[],p:OpportunityProfile,now=new Date()){
 return jobs.filter(j=>activeOpportunity(j,now)).map(job=>{
  const shared=job.skills.filter((s,i,a)=>a.findIndex(v=>norm(v)===norm(s))===i&&p.skills.some(x=>norm(x)===norm(s)));
  const sought=p.preferredOccupations.some(o=>norm(o)===norm(job.title)||norm(o)===norm(job.occupationCategory));
  const occupation=Boolean(p.occupation&&norm(p.occupation)===norm(job.title));
  const reasons=shared.map(s=>'Recorded skill: '+s);let score=Math.min(shared.length,4)*5;
  if(sought){score+=8;reasons.push('Matches sought work.');}if(occupation){score+=4;reasons.push('Matches recorded occupation.');}
  const positive=score>0;
  if(p.preferredArea&&norm(p.preferredArea)===norm(job.barangay)){score+=2;reasons.push('Preferred barangay.');}
  if(p.workType===job.workType){score+=2;reasons.push('Preferred employment type.');}
  if(p.workArrangement===job.workArrangement){score+=2;reasons.push('Preferred work arrangement.');}
  const missingSkills=job.skills.filter(s=>!p.skills.some(v=>norm(v)===norm(s)));
  return {job,score,reasons,missingSkills,appropriate:positive&&qualificationGaps(job,p).length===0};
 }).filter(r=>r.appropriate).sort((a,b)=>b.score-a.score||Date.parse(b.job.publishedAt||'0')-Date.parse(a.job.publishedAt||'0')||a.job.id.localeCompare(b.job.id,'en')).slice(0,5);
}
export function readiness(p:OpportunityProfile,jobs:Opportunity[]=[]){
 const groups=[['Location',Boolean(p.preferredArea)],['Education',Boolean(p.education)],['Skills',p.skills.length>0],['Work goals',p.preferredOccupations.length>0||Boolean(p.occupation)],['Work arrangement',Boolean(p.workArrangement)],['Experience information',Boolean(p.experienceLevel)],['Training preference',typeof p.trainingInterest==='boolean']] as const;
 const answered=groups.filter(([,known])=>known).length,missing=groups.filter(([,known])=>!known).map(([label])=>label);
 const gaps=jobs.map(job=>({jobId:job.id,title:job.title,missing:[...qualificationGaps(job,p),...job.skills.filter(s=>!p.skills.some(v=>norm(v)===norm(s))).map(s=>'Skill to develop: '+s)]})).filter(g=>g.missing.length).slice(0,5);
 const suggestions=[...missing.map(s=>'Record '+s.toLowerCase()+' when known.'),...(p.trainingPrograms||[]).map(s=>'Explore training information for your recorded interest: '+s)];
 if(gaps.some(g=>g.missing.some(s=>s.startsWith('Certification'))))suggestions.push('Ask the issuing body about the specifically required certification; a course or degree alone is not proof of a licence.');
 return {completion:Math.round(answered/groups.length*100),answered,total:groups.length,missing,gaps,barriers:p.employmentBarriers||[],suggestions,notice:'Recorded information and suggestions only; no hiring or eligibility guarantee.'};
}
export function demandSkills(jobs:Opportunity[],now=new Date()){
 const counts=new Map<string,{skill:string;vacancies:number}>();for(const job of jobs){if(job.isDemo||!activeOpportunity(job,now))continue;for(const skill of new Set(job.skills.map(norm))){const label=job.skills.find(s=>norm(s)===skill)!;const current=counts.get(skill)||{skill:label,vacancies:0};current.vacancies++;counts.set(skill,current);}}
 return [...counts.values()].sort((a,b)=>b.vacancies-a.vacancies||norm(a.skill).localeCompare(norm(b.skill),'en'));
}
