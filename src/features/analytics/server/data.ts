import 'server-only';
import { prisma } from '@/lib/prisma';
import { recordScope, assertBarangay } from '@/features/census/server/data';
import type { CivicViewer } from '@/features/civic/types';
import type { Prisma } from '@/generated/prisma/client';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';
import { list, matchesAnalytics, summarizeAnalytics, type AnalyticsFilters, type AnalyticsRow, type AnalyticsResult } from '../domain';

// Deliberately omit user IDs, names, emails, contact details, addresses, free
// feedback and employment-history narratives from the analytical projection.
const individualSelect = {
  status:true,consentAggregated:true,barangay:true,ageGroup:true,educationLevel:true,employmentStatus:true,
  sex:true,civilStatus:true,pwdStatus:true,householdSize:true,currentlyStudying:true,overseasExperience:true,
  occupation:true,industry:true,workArrangement:true,workLocationScope:true,employmentLength:true,workRelatedToEducation:true,interestedNewWork:true,
  skillsJson:true,qualificationsJson:true,completedTrainingJson:true,trainingInterest:true,trainingCategoriesJson:true,trainingProgramsJson:true,trainingReason:true,trainingBarriersJson:true,employmentBarriersJson:true,
  preferredOccupationsJson:true,preferredIndustry:true,preferredWorkArrangement:true,preferredWorkLocation:true,willingOutsideMunicipality:true,
  interestedGovPrograms:true,interestedLivelihood:true,interestedEntrepreneurship:true,businessType:true,businessSector:true,businessLocationType:true,businessSize:true,businessRegistered:true,businessYears:true,businessChallengesJson:true,businessSupportJson:true,
  programAwareness:true,informationAccess:true,participatedConsultation:true,inclusivePlanning:true,priorityProgramsJson:true,publicServiceBarriersJson:true,serviceSatisfaction:true,
} satisfies Prisma.CommunitySurveySelect;
function analytical(row: Record<string,unknown>): AnalyticsRow {
  return Object.fromEntries(Object.entries(row).filter(([key])=>!['status','consentAggregated'].includes(key)).map(([key,value])=>key.endsWith('Json')?[key.slice(0,-4),list(value)]:[key,value]));
}
type Geography = {barangay?:string | {in:string[]}};
const geography = (scope:string[]|null,filters:AnalyticsFilters): Geography => filters.barangay ? {barangay:filters.barangay} : scope===null ? {} : {barangay:{in:scope}};
// Prisma's MySQL text predicates inherit case/accent-insensitive collation.
// Apply the same exact canonical authority as record/history/review checks
// before any counts, exclusion metadata or categories can be emitted.
const inScope = (scope:string[]|null,barangay:unknown) => scope===null || typeof barangay==='string' && scope.includes(barangay);
async function rosters(tx: Prisma.TransactionClient, scope:string[]|null, filters:AnalyticsFilters) {
  const barangays=filters.barangay?[filters.barangay]:scope===null?[...LOS_BANOS_BARANGAYS]:scope;
  const records=await tx.censusAssistanceRoster.findMany({where:{barangay:{in:barangays}},include:{members:{select:{staff:{select:{role:true}}}}}});
  return barangays.map(barangay=>{
    const row=records.find(r=>r.barangay===barangay);
    const active=row?.members.filter(m=>m.staff.role==='STAFF').length??0;
    return {barangay,count:!row || row.members.length>0 && active===0 ? null : active,confirmedAt:row?.confirmedAt.toISOString()??null,needsConfirmation:!!row && row.members.length>0 && active===0};
  });
}
const organizationFields=['barangay','industry','organizationType','employerType','officeType','operatingStatus','marketReach','totalWorkers','regularWorkers','nonRegularWorkers','partTimeWorkers','monthsOperated'];
async function establishments(tx: Prisma.TransactionClient, scope:string[]|null, filters:AnalyticsFilters, excluded:Record<string,number>) {
  const json="(CASE WHEN JSON_VALID(submittedJson) THEN submittedJson ELSE '{}' END)";
  const field=(key:string)=>"JSON_EXTRACT("+json+",'$.\""+key+"\"')";
  const where=['surveyYear=?','submittedJson IS NOT NULL'],values:(number|string)[]=[filters.year];
  if(filters.barangay){where.push('BINARY JSON_UNQUOTE('+field('barangay')+')=?');values.push(filters.barangay);}
  else if(scope!==null){where.push(scope.length?'BINARY JSON_UNQUOTE('+field('barangay')+') IN ('+scope.map(()=>'?').join(',')+')':'1=0');values.push(...scope);}
  const projection="JSON_OBJECT("+organizationFields.map(key=>"'"+key+"',"+field(key)).join(',')+")";
  const rows=await tx.$queryRawUnsafe<{status:string;answers:string|AnalyticsRow}[]>('SELECT status,'+projection+' answers FROM establishment_survey WHERE '+where.join(' AND '),...values);
  const eligible:AnalyticsRow[]=[];
  for(const row of rows){const answers=typeof row.answers==='string'?JSON.parse(row.answers) as AnalyticsRow:row.answers;if(!matchesAnalytics(answers,filters))continue;if(row.status!=='SUBMITTED'){excluded.withdrawnOrUnsubmittedAnnual=(excluded.withdrawnOrUnsubmittedAnnual??0)+1;continue;}eligible.push(answers);}
  return [{source:'Establishment annual submissions',unit:'establishments',...summarizeAnalytics(eligible,'ESTABLISHMENT')}];
}
const importedSelect = {surveyYear:true,sourceKey:true,outcome:true,participantRef:true,barangay:true,ageGroup:true,educationLevel:true,employmentStatus:true,occupation:true,industry:true,skillsJson:true,trainingInterest:true,trainingCategoriesJson:true,trainingProgramsJson:true,trainingBarriersJson:true,employmentBarriersJson:true,businessSector:true,assistanceNeededJson:true,batch:{select:{surveyYear:true,sourceKey:true}}} satisfies Prisma.CommunityImportRecordSelect;
async function imported(tx:Prisma.TransactionClient,scope:string[]|null,filters:AnalyticsFilters,excluded:Record<string,number>) {
  // Resolve stable-source versions within authorized geography before applying
  // the selected barangay or demographics; filters must not revive a conflict.
  const records=await tx.communityImportRecord.findMany({where:{...geography(scope,{...filters,barangay:undefined}),batch:{status:'ACTIVE'}},select:importedSelect});
  const candidates:{source:string;sourceIdentity:string|null;reference:string|null;answers:AnalyticsRow}[]=[];
  for(const row of records) {
    if(!inScope(scope,row.barangay))continue;
    const {surveyYear,sourceKey,outcome,participantRef,batch,...fields}=row,answers=analytical(fields);
    const matches=matchesAnalytics(answers,filters);
    const rowSource=sourceKey?.normalize('NFKC').trim()||null, batchSource=batch.sourceKey?.normalize('NFKC').trim()||null;
    const actualSource=rowSource??batchSource;
    const sourceIdentity=actualSource?.toUpperCase()??null;
    const source=actualSource??'Unspecified legacy source';
    if(filters.source && source.normalize('NFKC').trim().toUpperCase()!==filters.source.normalize('NFKC').trim().toUpperCase())continue;
    const year=surveyYear??batch.surveyYear;
    if(year===null){if(matches)excluded.unknownSurveyYear=(excluded.unknownSurveyYear??0)+1;continue;}
    if(year!==filters.year)continue;
    if(surveyYear!==null && batch.surveyYear!==null && surveyYear!==batch.surveyYear || rowSource!==null && batchSource!==null && rowSource.toUpperCase()!==batchSource.toUpperCase()){if(matches)excluded.inconsistentSourceContext=(excluded.inconsistentSourceContext??0)+1;continue;}
    if(outcome!=='ACCEPTED'){if(matches)excluded.notAccepted=(excluded.notAccepted??0)+1;continue;}
    candidates.push({source,sourceIdentity,reference:participantRef?.normalize('NFKC').trim()||null,answers});
  }
  // Defensive legacy handling: only stable source/year/reference identity can
  // deduplicate. Anonymous/equal-answer observations remain separate.
  const stable=new Map<string,typeof candidates>();
  const anonymous:typeof candidates=[];
  for(const row of candidates){if(row.sourceIdentity===null || row.reference===null){anonymous.push(row);continue;}const key=JSON.stringify([row.sourceIdentity,filters.year,row.reference]);const rows=stable.get(key)??[];rows.push(row);stable.set(key,rows);}
  const accepted=[...anonymous];
  for(const rows of stable.values()){
    if(new Set(rows.map(r=>JSON.stringify(r.answers))).size>1){excluded.conflictingAcceptedSourceRecords=(excluded.conflictingAcceptedSourceRecords??0)+rows.filter(r=>matchesAnalytics(r.answers,filters)).length;continue;}
    accepted.push(rows[0]);if(matchesAnalytics(rows[0].answers,filters))excluded.identicalStableSourceDuplicates=(excluded.identicalStableSourceDuplicates??0)+rows.length-1;
  }
  const groups=new Map<string,AnalyticsRow[]>();
  for(const row of accepted){if(!matchesAnalytics(row.answers,filters))continue;const rows=groups.get(row.source)??[];rows.push(row.answers);groups.set(row.source,rows);}
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([source,rows])=>({source,unit:'source observations',...summarizeAnalytics(rows,'IMPORTS')}));
}
async function spes(tx:Prisma.TransactionClient,scope:string[]|null,filters:AnalyticsFilters,excluded:Record<string,number>) {
  const records=await tx.spesSurveyRecord.findMany({where:{...geography(scope,filters),batch:{status:'ACTIVE',...(filters.dataset!=='ALL'?{datasetKind:filters.dataset}:{})}},select:{barangay:true,education:true,skillsJson:true,interestsJson:true,availability:true,batch:{select:{surveyYear:true,sourceLabel:true,datasetKind:true}}}});
  const groups=new Map<string,AnalyticsRow[]>();
  for(const row of records){
    if(!inScope(scope,row.barangay))continue;
    // MySQL's accent-insensitive collation is not source identity.
    if(filters.source && row.batch.sourceLabel.normalize('NFKC').trim().toUpperCase()!==filters.source.normalize('NFKC').trim().toUpperCase())continue;
    const answers={barangay:row.barangay,educationLevel:row.education,skills:list(row.skillsJson),trainingPrograms:list(row.interestsJson),availability:row.availability};
    if(!matchesAnalytics(answers,filters))continue;
    if(row.batch.surveyYear===null){excluded.unknownSurveyYear=(excluded.unknownSurveyYear??0)+1;continue;}
    if(row.batch.surveyYear!==filters.year)continue;
    const source=row.batch.sourceLabel+' ['+row.batch.datasetKind+']',rows=groups.get(source)??[];rows.push(answers);groups.set(source,rows);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([source,rows])=>({source,unit:'source observations',...summarizeAnalytics(rows,'SPES')}));
}
export async function workforceAnalytics(viewer:CivicViewer, filters:AnalyticsFilters):Promise<AnalyticsResult & {availableBarangays:string[]}> {
  const scope=await recordScope(viewer);
  if(filters.barangay)assertBarangay(scope,filters.barangay);
  return prisma.$transaction(async tx=>{
    const excluded:Record<string,number>={};
    let groups;
    if(filters.population==='ESTABLISHMENT')groups=await establishments(tx,scope,filters,excluded);
    else if(filters.population==='IMPORTS')groups=await imported(tx,scope,filters,excluded);
    else if(filters.population==='SPES')groups=await spes(tx,scope,filters,excluded);
    else {
      const rows=await tx.communitySurvey.findMany({where:{surveyYear:filters.year,...geography(scope,filters)},select:individualSelect});
      const eligible:AnalyticsRow[]=[];
      for(const row of rows){
        if(!inScope(scope,row.barangay))continue;
        const answers=analytical(row);
        if(!matchesAnalytics(answers,filters))continue;
        if(row.status!=='SUBMITTED'){const key=row.status==='WITHDRAWN'?'withdrawnAnnual':'unsubmittedCompatibilityRows';excluded[key]=(excluded[key]??0)+1;continue;}
        if(!row.consentAggregated){excluded.noAggregateConsent=(excluded.noAggregateConsent??0)+1;continue;}
        eligible.push(answers);
      }
      groups=[{source:'Citizen survey',unit:'respondents',...summarizeAnalytics(eligible,'INDIVIDUAL')}];
    }
    return {filters,groups,excluded,availableBarangays:scope===null?[...LOS_BANOS_BARANGAYS]:scope,rosters:await rosters(tx,scope,filters),methodology:[
      'Missing or unknown source context cannot establish stable identity: observations remain separate with uncertain overlap, even when local references or answers match.',
      'Protected analytics: CENSUS permission and current barangay record scope apply to this view and export. Public/citizen release is unavailable.',
      'One exact survey year: '+filters.year+'. Current means the Manila calendar year; selected-year results are the currently retained annual submissions, not a reconstruction at a past date.',
      'Individuals are participating respondents, not municipality population coverage or an official unemployment rate. One eligible retained submission per owner/year; drafts and revisions are not extra respondents. Later drafts do not erase an eligible submission. Withdrawn annual responses and missing aggregate-purpose consent are excluded; matching/program preferences do not grant or revoke statistical consent.',
      'Establishment counts and known organizational workforce are separate from individual respondents. Part-time overlaps regular/nonregular counts; unknown totals are not inferred. Canonical establishment identity does not replace the annual snapshot.',
      'Imported source observations are grouped separately by source/year (and SPES dataset kind). They are not unique additional people or combined with citizen surveys. Uncertain cross-source overlaps are not merged. Rejected, skipped, held and inactive records are excluded. Unknown survey years are not replaced by activity dates.',
      'Percentages use each displayed source-group denominator, including missing answers. Multiselect categories count an observation at most once per category; category totals can exceed the denominator. No selections recorded does not establish absence of qualifications or training.',
      'Numerical summaries use only known values; zero is known, missing is not zero. A zero-population percentage or entirely unknown measure is unavailable. Household size and satisfaction means are respondent-based and are not community headcounts.',
      'Planning considerations describe reported associations, not proven causes, verified needs, service commitments or individual matching.',
      'Designated survey-assistance staff is a separate current maintained roster, not survey-year workforce or real-time availability. Not configured / requires confirmation differs from a confirmed empty roster.',
    ]};
  },{isolationLevel:'RepeatableRead',maxWait:10000,timeout:60000});
}
