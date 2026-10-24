import { CivicError } from '@/features/civic/validation';
import { AGE_GROUPS, EDUCATION_LEVELS, EDUCATION_LABELS, EMPLOYMENT_STATUSES, EMPLOYMENT_LABELS } from '@/features/community/domain';
import { INDUSTRIES, OPERATING_STATUSES } from '@/features/establishments/domain';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';

export const POPULATIONS = ['INDIVIDUAL', 'ESTABLISHMENT', 'IMPORTS', 'SPES'] as const;
export type Population = typeof POPULATIONS[number];
export type AnalyticsRow = Record<string, unknown>;
export type AnalyticsFilters = { population: Population; period: 'CURRENT' | 'YEAR'; year: number; barangay?: string; employment?: string; age?: string; education?: string; sex?: string; skill?: string; overseas?: string; industry?: string; operatingStatus?: string; source?: string; dataset?: string };
export function manilaYear(now = new Date()) { return Number(new Intl.DateTimeFormat('en', { timeZone:'Asia/Manila', year:'numeric' }).format(now)); }
const fail = (message: string): never => { throw new CivicError(message, 400); };
const clean = (v: unknown) => typeof v === 'string' ? v.normalize('NFKC').trim().replace(/\s+/g,' ') : '';
const token = (v: unknown) => clean(v).toLocaleLowerCase('en');
const applicable: Record<Population, string[]> = { INDIVIDUAL:['employment','age','education','sex','skill','overseas'], ESTABLISHMENT:['industry','operatingStatus'], IMPORTS:['employment','age','education','skill','source'], SPES:['education','skill','source','dataset'] };
export function parseAnalyticsFilters(input: Record<string, string | undefined> | URLSearchParams, currentYear = manilaYear()): AnalyticsFilters {
  const raw: Record<string,string> = {};
  const entries = input instanceof URLSearchParams ? [...input.entries()] : Object.entries(input);
  for (const [key,value] of entries) {
    if (Object.hasOwn(raw,key)) fail('Repeated analytics filters are not supported.');
    if (typeof value === 'string' && value.length <= 180) raw[key]=value.trim();
    else if (value !== undefined) fail('Invalid analytics filter.');
  }
  const population = (raw.population || 'INDIVIDUAL') as Population;
  if (!POPULATIONS.includes(population)) fail('Choose a valid population.');
  const allowed = ['population','period','year','barangay',...applicable[population]];
  if (Object.keys(raw).some(key=>!allowed.includes(key))) fail('Unknown or nonapplicable analytics filter.');
  const period = raw.period || 'CURRENT';
  if (period !== 'CURRENT' && period !== 'YEAR') fail('Choose current or selected survey year.');
  const yearText = raw.year || (period === 'CURRENT' ? String(currentYear) : '');
  if (!/^\d{4}$/.test(yearText) || Number(yearText)<2020 || Number(yearText)>currentYear+1 || (period === 'CURRENT' && Number(yearText)!==currentYear)) fail('Choose a valid survey year; current means the current Manila calendar year.');
  if (raw.barangay && !LOS_BANOS_BARANGAYS.includes(raw.barangay as never)) fail('Choose a valid barangay.');
  for (const [key, choices] of [['employment',EMPLOYMENT_STATUSES],['age',AGE_GROUPS],['education',EDUCATION_LEVELS],['overseas',['CURRENT','FORMER','NEVER']],['industry',INDUSTRIES.map(i=>i.value)],['operatingStatus',OPERATING_STATUSES],['dataset',['REAL','DEMO','ALL']]] as const) {
    if (raw[key] && !(key!=='dataset' && raw[key] === '__UNKNOWN__') && !(choices as readonly string[]).includes(raw[key])) fail('Choose a valid '+key+' filter.');
  }
  if (raw.sex && raw.sex.length>30 || raw.skill && raw.skill.length>80) fail('Analytics filter is too long.');
  return { ...Object.fromEntries(Object.entries(raw).filter(([,v])=>v)), population, period, year:Number(yearText), ...(population==='SPES' ? {dataset:raw.dataset || 'REAL'} : {}) } as AnalyticsFilters;
}
export function matchesAnalytics(row: AnalyticsRow, filters: AnalyticsFilters) {
  const fields: Record<string,string> = { employment:'employmentStatus', age:'ageGroup', education:'educationLevel', sex:'sex', overseas:'overseasExperience', industry:'industry', operatingStatus:'operatingStatus' };
  if (filters.barangay && row.barangay !== filters.barangay) return false;
  for (const [key,field] of Object.entries(fields)) {
    const requested = filters[key as keyof AnalyticsFilters];
    if (!requested) continue;
    if (requested==='__UNKNOWN__' ? clean(row[field])!=='' : token(requested)!==token(row[field])) return false;
  }
  if (filters.skill && !list(row.skills).some(v=>token(v)===token(filters.skill))) return false;
  return true;
}
export function list(value: unknown): string[] {
  if (typeof value==='string') { try { value=JSON.parse(value); } catch { return []; } }
  return Array.isArray(value) ? value.filter((v): v is string => typeof v==='string').map(clean).filter(Boolean) : [];
}
type Definition = { key:string; title:string; multi?:boolean };
const base: Definition[] = [{key:'barangay',title:'Barangay'},{key:'educationLevel',title:'Education'}];
const employment: Definition[] = [
  {key:'employmentStatus',title:'Reported employment status / type'}, {key:'ageGroup',title:'Age group'},
  {key:'occupation',title:'Reported occupations'}, {key:'industry',title:'Individual work industry'},
  {key:'skills',title:'Reported skills',multi:true}, {key:'trainingInterest',title:'Training interest'},
  {key:'trainingCategories',title:'Training categories requested',multi:true}, {key:'trainingPrograms',title:'Training programs requested',multi:true},
  {key:'trainingBarriers',title:'Reported training barriers',multi:true}, {key:'employmentBarriers',title:'Reported employment barriers',multi:true},
  {key:'businessSector',title:'Livelihood / business sectors'},
];
const personal: Definition[] = [
  {key:'sex',title:'Sex (self-reported)'},{key:'civilStatus',title:'Civil status'},{key:'pwdStatus',title:'Disability status (self-reported)'},
  {key:'currentlyStudying',title:'Currently studying'},{key:'workArrangement',title:'Work arrangement'},{key:'workLocationScope',title:'Work location scope'},
  {key:'employmentLength',title:'Length of current employment'},{key:'workRelatedToEducation',title:'Work related to education'},{key:'interestedNewWork',title:'Interested in new work'},
  {key:'preferredOccupations',title:'Commonly sought work',multi:true},{key:'preferredIndustry',title:'Preferred work industry'},
  {key:'preferredWorkArrangement',title:'Preferred work arrangement'},{key:'preferredWorkLocation',title:'Preferred work location'},{key:'willingOutsideMunicipality',title:'Willing to work outside municipality'},
  {key:'overseasExperience',title:'Current / former overseas employment experience'},
  {key:'qualifications',title:'Acquired qualifications / certifications',multi:true},{key:'completedTraining',title:'Completed training',multi:true},
  {key:'trainingReason',title:'Reason for training interest'},{key:'interestedGovPrograms',title:'Government program interest'},{key:'interestedLivelihood',title:'Livelihood program interest'},{key:'interestedEntrepreneurship',title:'Entrepreneurship interest'},
  {key:'businessType',title:'Livelihood business type'},{key:'businessLocationType',title:'Business location type'},{key:'businessSize',title:'Business size category'},{key:'businessRegistered',title:'Business registration (reported)'},{key:'businessYears',title:'Years in business'},
  {key:'businessChallenges',title:'Reported livelihood challenges',multi:true},{key:'businessSupport',title:'Requested livelihood support',multi:true},
  {key:'programAwareness',title:'Program awareness'},{key:'informationAccess',title:'Access to program information'},{key:'participatedConsultation',title:'Consultation participation'},
  {key:'inclusivePlanning',title:'Perceived planning inclusion'},{key:'priorityPrograms',title:'Priority programs',multi:true},{key:'publicServiceBarriers',title:'Public service barriers',multi:true},
];
const organizational: Definition[] = [
  {key:'barangay',title:'Establishment annual location'},{key:'industry',title:'Line of business / industry'},
  {key:'organizationType',title:'Organization type'},{key:'employerType',title:'Employer type'},{key:'officeType',title:'Main / branch offices'},
  {key:'operatingStatus',title:'Operating condition'},{key:'marketReach',title:'Market reach'},
];
function label(value: string, key:string) {
  if (value==='true') return 'Yes'; if (value==='false') return 'No';
  if (key==='employmentStatus') return EMPLOYMENT_LABELS[value as keyof typeof EMPLOYMENT_LABELS] ?? value;
  if (key==='educationLevel') return EDUCATION_LABELS[value as keyof typeof EDUCATION_LABELS] ?? value;
  if (key==='industry') return INDUSTRIES.find(i=>i.value===value)?.label ?? value;
  if (/^[A-Z_]+$/.test(value)) return value.replaceAll('_',' ').toLowerCase().replace(/^\w/,c=>c.toUpperCase());
  return value;
}
function breakdown(rows: AnalyticsRow[], definition: Definition) {
  const counts=new Map<string,{label:string;count:number;unknown:boolean}>();
  let known=0;
  for (const row of rows) {
    const value=row[definition.key];
    const values=definition.multi ? list(value) : value===null || value===undefined || value==='' ? [] : [typeof value==='boolean' ? String(value) : clean(value)].filter(Boolean);
    const unique=new Map(values.map(v=>[token(v),v]));
    if (unique.size) known++;
    else { const item=counts.get('__UNKNOWN__') ?? {label:definition.multi?'No selections recorded':'Unknown / not recorded',count:0,unknown:true}; item.count++;counts.set('__UNKNOWN__',item); }
    for (const [key,text] of unique) {
      const item=counts.get(key) ?? {label:label(text,definition.key),count:0,unknown:false};item.count++;counts.set(key,item);
    }
  }
  return { ...definition, denominator:rows.length, known, missing:rows.length-known, items:[...counts].map(([key,item])=>({key,...item,percent:rows.length ? Math.round(item.count/rows.length*10000)/100 : null})).sort((a,b)=>Number(a.unknown)-Number(b.unknown)||b.count-a.count||a.label.localeCompare(b.label)) };
}
function measure(rows: AnalyticsRow[], key:string, title:string) {
  const numbers=rows.map(r=>r[key]).filter((v): v is number => typeof v==='number' && Number.isFinite(v) && v>=0);
  const sum=numbers.length ? numbers.reduce((a,b)=>a+b,0) : null;
  return {key,title,sum:key.endsWith('Workers')?sum:null,mean:sum===null?null:Math.round(sum/numbers.length*100)/100,known:numbers.length,unknown:rows.length-numbers.length,denominator:rows.length};
}
export function summarizeAnalytics(rows: AnalyticsRow[], population: Population) {
  const definitions=population==='ESTABLISHMENT' ? organizational : population==='SPES' ? [...base,{key:'skills',title:'Reported skills',multi:true},{key:'trainingPrograms',title:'Recorded interests',multi:true},{key:'availability',title:'Recorded availability'}] : [...base,...employment,...(population==='INDIVIDUAL' ? personal : [{key:'assistanceNeeded',title:'Requested assistance',multi:true}])];
  const measures=population==='ESTABLISHMENT' ? [['totalWorkers','Reported total workforce'],['regularWorkers','Reported regular workers'],['nonRegularWorkers','Reported nonregular workers'],['partTimeWorkers','Reported part-time workers (overlapping)'],['monthsOperated','Months operated']] : population==='INDIVIDUAL' ? [['householdSize','Household size'],['serviceSatisfaction','Service satisfaction (1–5)']] : [];
  const breakdowns=definitions.map(d=>breakdown(rows,d));
  const barriers=breakdowns.find(d=>d.key==='employmentBarriers')?.items.filter(i=>!i.unknown) ?? [];
  const considerations=barriers.map(item=>({barrier:item.label,count:item.count,suggestion:/cost|transport/i.test(item.label)?'Explore transport access and outreach options.':/skill|qualif|experience|training/i.test(item.label)?'Explore training, certification or work-experience support.':/child|family|care/i.test(item.label)?'Explore flexible schedules and care-support coordination.':/information|internet/i.test(item.label)?'Explore accessible information and outreach.':/document|requirement/i.test(item.label)?'Explore document and certification assistance.':'Follow up with participants to identify suitable support.'}));
  return {count:rows.length,breakdowns,measures:measures.map(([key,title])=>measure(rows,key,title)),considerations};
}
export type AnalyticsGroup = ReturnType<typeof summarizeAnalytics> & {source:string;unit:string};
export type AnalyticsResult = {filters:AnalyticsFilters;groups:AnalyticsGroup[];methodology:string[];excluded:Record<string,number>;rosters:Array<{barangay:string;count:number|null;[key:string]:unknown}>};
function csvCell(value: unknown) {
  let text=String(value??''); if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function analyticsCsv(result: AnalyticsResult) {
  const rows: unknown[][]=[['population','source','unit','survey_year','metric','item','count_or_sum','denominator','known','unknown','percent','mean']];
  rows.push([result.filters.population,'FILTERS','metadata',result.filters.year,'filters',JSON.stringify(result.filters)]);
  for (const note of result.methodology) rows.push([result.filters.population,'METHODOLOGY','metadata',result.filters.year,'methodology',note]);
  for (const group of result.groups) {
    const prefix=[result.filters.population,group.source,group.unit,result.filters.year];
    rows.push([...prefix,'selected_total','',group.count,group.count]);
    for (const d of group.breakdowns) for (const item of d.items) rows.push([...prefix,d.key,item.label,item.count,d.denominator,d.known,d.missing,item.percent]);
    for (const m of group.measures) rows.push([...prefix,m.key,'known-value measure',m.sum,m.denominator,m.known,m.unknown,'',m.mean]);
    for (const c of group.considerations) rows.push([...prefix,'planning_consideration',c.barrier+': '+c.suggestion+' Reported association, not a proven cause.',c.count,group.count]);
  }
  for (const [key,count] of Object.entries(result.excluded)) rows.push([result.filters.population,'EXCLUSIONS','records',result.filters.year,key,'',count]);
  for (const roster of result.rosters) rows.push(['ASSISTANCE_ROSTER','Current maintained roster','designated survey-assistance staff','not survey-year based',roster.barangay,roster.count===null?'Not configured / requires confirmation':'Confirmed',roster.count]);
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
