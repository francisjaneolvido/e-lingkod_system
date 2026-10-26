"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight, BriefcaseBusiness, CheckCircle2, MapPin,
  Search, SlidersHorizontal, Sparkles, X,
} from "lucide-react";
import { WORK_LABEL } from "../domain";

type MatchExplanation = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedInterests: string[];
  availabilityFit: boolean;
  locationFit: boolean;
};

type JobSummary = {
  id: string;
  title: string;
  employer: string;
  sector: string;
  workType: string;
  barangay: string;
  location: string;
  description: string;
  education: string;
  contactInfo: string;
  externalUrl: string | null;
  publishedAt: string;
  expiresAt: string | null;
  skills: string[];
  interests: string[];
  match: MatchExplanation | null;
};

function RecommendationWhy({match}:{match:MatchExplanation}){
 const reasons=[] as string[];
 if(match.matchedSkills.length)reasons.push(`${match.matchedSkills.length} shared skill${match.matchedSkills.length===1?"":"s"}`);
 if(match.matchedInterests.length)reasons.push("Related interest");
 if(match.availabilityFit)reasons.push("Preferred work type");
 if(match.locationFit)reasons.push("Preferred location");
 return <div className="mt-4 rounded-xl border border-border bg-muted px-3.5 py-3 text-xs leading-5 text-success"><div className="flex items-start gap-2"><Sparkles size={16} className="mt-0.5 shrink-0"/><div><strong>Why this may interest you</strong><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{reasons.length?reasons.map(reason=><span key={reason}>✓ {reason}</span>):<span>Review the listing to compare it with your goals.</span>}</div>{match.missingSkills.length>0&&<p className="mt-1 text-success">Skills worth reviewing: {match.missingSkills.slice(0,2).join(", ")}{match.missingSkills.length>2?" + more":""}</p>}</div></div></div>;
}

export function OpportunitiesBrowser({ jobs, personalized }: { jobs: JobSummary[]; personalized: boolean }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [sector, setSector] = useState("ALL");
  const [barangay,setBarangay]=useState("ALL");
  const [skill,setSkill]=useState("ALL");
  const [sort,setSort]=useState(personalized?"RECOMMENDED":"NEWEST");
  const sectors = useMemo(() => [...new Set(jobs.map(job => job.sector))].sort(), [jobs]);
  const barangays=useMemo(()=>[...new Set(jobs.map(job=>job.barangay).filter(Boolean))].sort(),[jobs]);
  const skills=useMemo(()=>[...new Set(jobs.flatMap(job=>job.skills))].sort(),[jobs]);
  const hasFilters = Boolean(search || type !== "ALL" || sector !== "ALL" || barangay!=="ALL" || skill!=="ALL");
  const shown = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered=jobs.filter(job =>
      (type === "ALL" || job.workType === type) &&
      (sector === "ALL" || job.sector === sector) &&
      (barangay==="ALL"||job.barangay===barangay)&&
      (skill==="ALL"||job.skills.includes(skill))&&
      [job.title, job.employer, job.sector, job.barangay, job.location, ...job.skills]
        .join(" ").toLocaleLowerCase().includes(query)
    );
    return [...filtered].sort((a,b)=>sort==="RECOMMENDED"?(b.match?.score??0)-(a.match?.score??0):new Date(b.publishedAt).getTime()-new Date(a.publishedAt).getTime());
  }, [jobs, search, type, sector,barangay,skill,sort]);

  function clearFilters() {
    setSearch("");setType("ALL");setSector("ALL");setBarangay("ALL");setSkill("ALL");
  }

  return (
    <section aria-label="Explore published job opportunities" className="space-y-5">
      <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_5px_22px_rgba(17,63,97,.035)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="text-lg font-extrabold tracking-tight text-foreground">Explore available opportunities</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Search by role, employer, location or skill. Recommendations are suggestions, not eligibility scores.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-bold text-foreground"><SlidersHorizontal size={14} /> Search & filter</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 focus-within:border-border focus-within:ring-2 focus-within:ring-border md:col-span-2 xl:col-span-1"><Search size={18} className="shrink-0 text-muted-foreground" /><span className="sr-only">Search job opportunities</span><input type="search" placeholder="Job title, employer, barangay or skill" className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <label><span className="sr-only">Filter by employment type</span><select aria-label="Filter by employment type" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground" value={type} onChange={event => setType(event.target.value)}><option value="ALL">All work types</option>{["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP"].map(item => <option key={item} value={item}>{WORK_LABEL[item]}</option>)}</select></label>
          <label><span className="sr-only">Filter by sector</span><select aria-label="Filter by sector" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground" value={sector} onChange={event => setSector(event.target.value)}><option value="ALL">All sectors</option>{sectors.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Filter by barangay</span><select aria-label="Filter by barangay" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground" value={barangay} onChange={event=>setBarangay(event.target.value)}><option value="ALL">All barangays</option>{barangays.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Filter by skill</span><select aria-label="Filter by skill" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground" value={skill} onChange={event=>setSkill(event.target.value)}><option value="ALL">All skills</option>{skills.map(item=><option key={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Sort opportunities</span><select aria-label="Sort opportunities" className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground" value={sort} onChange={event=>setSort(event.target.value)}>{personalized&&<option value="RECOMMENDED">Recommended first</option>}<option value="NEWEST">Newest first</option></select></label>
        </div>
        <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2" role="status" aria-live="polite"><p className="text-sm font-medium text-muted-foreground"><strong className="text-foreground">{shown.length}</strong> of {jobs.length} available {jobs.length === 1 ? "listing" : "listings"}<span className="ml-2 text-xs">· {sort==="RECOMMENDED"?"Recommended order":"Newest first"}</span></p>{hasFilters && <button type="button" onClick={clearFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-foreground hover:bg-muted"><X size={14} /> Clear filters</button>}</div>
      </div>

      {shown.length > 0 ? <div className="grid items-stretch gap-4 lg:grid-cols-2">{shown.map(job => <article key={job.id} className="flex min-w-0 flex-col rounded-[22px] border border-border bg-card p-5 shadow-[0_7px_24px_rgba(15,64,101,.04)] transition hover:border-border hover:shadow-[0_12px_30px_rgba(15,64,101,.08)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl border border-border bg-muted text-foreground"><BriefcaseBusiness size={21} /></span><span className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-success">Open listing</span></div><div className="mt-4 flex-1"><h3 className="text-[19px] font-extrabold leading-7 tracking-tight text-foreground">{job.title}</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">{job.employer}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">{job.sector}</span><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">{WORK_LABEL[job.workType] || job.workType}</span></div><p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={16} className="mt-0.5 shrink-0" />{job.location} · {job.barangay}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{job.description}</p>{job.skills.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Listed skills">{job.skills.slice(0, 3).map(skill => <span key={skill} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{skill}</span>)}{job.skills.length > 3 && <span className="px-1 text-xs font-semibold text-muted-foreground">+{job.skills.length - 3} more</span>}</div>}{personalized && job.match && <RecommendationWhy match={job.match}/>}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CheckCircle2 size={15} className="text-success" /> PESO-published listing</span><Link href={`/opportunities/${encodeURIComponent(job.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary">View details <ArrowRight size={16} /></Link></div></article>)}</div> : <div className="rounded-[22px] border border-dashed border-border bg-card p-9 text-center sm:p-12"><BriefcaseBusiness size={35} className="mx-auto text-muted-foreground" /><h3 className="mt-3 text-lg font-extrabold text-foreground">{jobs.length ? "No opportunities match your filters" : "No published opportunities yet"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{jobs.length ? "Try a different keyword, location, skill, work type or sector." : "PESO opportunities will appear here once they are reviewed and published."}</p>{hasFilters && <button className="mt-5 min-h-11 rounded-xl border border-border px-5 py-2 text-sm font-bold text-foreground hover:bg-muted" type="button" onClick={clearFilters}>Show all opportunities</button>}</div>}
    </section>
  );
}
