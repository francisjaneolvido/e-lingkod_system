import type {AnalyticsGroup} from '../domain';
type Breakdown=AnalyticsGroup['breakdowns'][number];
const priorities:Record<string,string[]>={
  INDIVIDUAL:['employmentStatus','ageGroup','educationLevel','barangay','skills','employmentBarriers'],
  ESTABLISHMENT:['industry','operatingStatus','organizationType','barangay','officeType','employerType'],
  IMPORTS:['employmentStatus','ageGroup','educationLevel','barangay','skills','assistanceNeeded'],
  SPES:['educationLevel','barangay','skills','trainingPrograms','availability','ageGroup'],
};
export function overviewBreakdowns(group:AnalyticsGroup,population:string) {
  return (priorities[population]??[]).flatMap(key=>{const item=group.breakdowns.find(d=>d.key===key);return item?[item]:[];});
}
export function factualFinding(data:Breakdown) {
  if(data.denominator===0)return 'No eligible records in this source view.';
  const known=data.items.filter(item=>!item.unknown&&item.count>0).toSorted((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
  if(!known.length)return 'No recorded category to rank; unknown values remain included as labelled.';
  const first=known[0],tied=known.filter(i=>i.count===first.count).length>1;
  return `${tied?'Joint highest recorded count':'Highest recorded count'}: ${first.label}, ${first.count} of ${data.denominator}${first.percent==null?'':` (${first.percent}%)`}.`;
}
