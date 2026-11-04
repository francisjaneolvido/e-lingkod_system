"use client";
import { useRef } from "react";
import { EMPLOYMENT_LABELS } from "../domain";

export type ProfileHistoryEntry = { id:string; revision:number; action:string; actorId:string; createdAt:string; answers:Record<string,unknown> };
const labels: Record<string,string> = {
  surveyYear:"Survey year",status:"Record status",barangay:"Barangay",ageGroup:"Age group",sex:"Sex / gender",civilStatus:"Civil status",pwdStatus:"Disability information",householdSize:"Household size",currentlyStudying:"Currently studying",
  educationLevel:"Educational attainment",employmentStatus:"Employment status",occupation:"Occupation",industry:"Industry",workArrangement:"Work arrangement",workLocationScope:"Work location",employmentLength:"Employment duration",workRelatedToEducation:"Work related to education",interestedNewWork:"Interested in new work",
  employmentHistory:"Employment history",overseasExperience:"Overseas employment experience",qualifications:"Acquired qualifications / certifications",completedTraining:"Completed training",skills:"Skills",skillLevels:"Skill levels",
  trainingInterest:"Training interest",trainingCategories:"Training categories",trainingPrograms:"Preferred training",trainingReason:"Reason for training",trainingBarriers:"Training barriers",employmentBarriers:"Employment barriers",
  preferredOccupations:"Preferred occupations",preferredIndustry:"Preferred industry",preferredWorkArrangement:"Preferred work arrangement",preferredWorkLocation:"Preferred work location",willingOutsideMunicipality:"Willing to work outside the municipality",
  interestedGovPrograms:"Interested in government programs",interestedLivelihood:"Interested in livelihood programs",interestedEntrepreneurship:"Interested in entrepreneurship",
  businessType:"Business / livelihood type",businessSector:"Business sector",businessLocationType:"Business location type",businessSize:"Business size",businessRegistered:"Business registration",businessYears:"Years in business",businessChallenges:"Business challenges",businessSupport:"Business support needed",
  programAwareness:"Program awareness",informationAccess:"Access to information",participatedConsultation:"Consultation participation",inclusivePlanning:"Inclusive planning",priorityPrograms:"Priority programs",publicServiceBarriers:"Service-access barriers",serviceSatisfaction:"Service satisfaction",feedback:"Feedback",
  consentAggregated:"Aggregate statistics consent at submission",consentOpportunityRecommendations:"Opportunity consent at submission",consentProgramRecommendations:"Program consent at submission",
};
function answer(value:unknown):string{
  if(value===null||value===undefined||value==="")return "Not answered";
  if(typeof value==="boolean")return value?"Yes":"No";
  if(Array.isArray(value))return value.length?value.join(", "):"Not answered";
  if(typeof value==="object")return Object.entries(value).map(([key,value])=>key+": "+String(value)).join("; ")||"Not answered";
  return EMPLOYMENT_LABELS[String(value)]||String(value).replaceAll("_"," ");
}
export function CitizenProfileHistory({entries}:{entries:ProfileHistoryEntry[]}){
  if(!entries.length)return <p className="text-sm text-muted-foreground">No submitted history for this survey year yet. Saved drafts are private and do not contribute to submitted-response statistics.</p>;
  return <section aria-labelledby="profile-history-title" className="rounded-[24px] border border-border bg-card p-6 sm:p-8">
    <h2 id="profile-history-title" className="text-xl font-bold text-foreground">My submitted history</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Earlier answers stay protected when you update or withdraw a response. Historic consent shown here does not override your current preferences.</p>
    <div className="mt-5 divide-y divide-border">{entries.map(entry=><details key={entry.id} className="py-4">
      <summary className="cursor-pointer rounded-2xl text-sm font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-4">{entry.action==="WITHDRAWN"?"Response withdrawn":"Submitted revision "+entry.revision} · {new Date(entry.createdAt).toLocaleString("en-PH")}</summary>
      <p className="mt-3 text-xs text-muted-foreground">Recorded by you. This entry preserves the answers at that time.</p>
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">{Object.entries(labels).filter(([key])=>key in entry.answers).map(([key,label])=><div key={key} className="min-w-0"><dt className="text-xs font-bold text-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{answer(entry.answers[key])}</dd></div>)}</dl>
    </details>)}</div>
  </section>;
}
export function WithdrawSurvey({disabled,onWithdraw}:{disabled:boolean;onWithdraw:()=>Promise<void>}){
  const dialog=useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" disabled={disabled} onClick={()=>dialog.current?.showModal()} className="min-h-11 rounded-2xl border border-border px-4 text-sm font-bold text-foreground disabled:opacity-40">Withdraw this year&apos;s response</button>
    <dialog ref={dialog} aria-labelledby="withdraw-survey-title" className="m-auto max-w-lg rounded-[24px] border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-primary/40">
      <h2 id="withdraw-survey-title" className="text-xl font-bold">Withdraw this response?</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">This year&apos;s response will leave active statistics. Optional recommendations will be disabled, the current draft will be cleared, and submitted history will remain protected. A new submission is needed to participate again.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" autoFocus onClick={()=>dialog.current?.close()} className="min-h-11 rounded-2xl border border-border px-4 font-bold">Keep response</button><button type="button" onClick={()=>{dialog.current?.close();void onWithdraw();}} className="min-h-11 rounded-2xl bg-primary px-4 font-bold text-white">Withdraw response</button></div>
    </dialog>
  </>;
}

