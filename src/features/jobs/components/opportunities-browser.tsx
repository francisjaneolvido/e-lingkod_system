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
  expiresAt: string | null;
  skills: string[];
  interests: string[];
  match: MatchExplanation | null;
};

function matchDescription(match: MatchExplanation) {
  if (match.matchedSkills.length) {
    return `Shared skills: ${match.matchedSkills.slice(0, 2).join(", ")}${match.matchedSkills.length > 2 ? " + more" : ""}`;
  }
  if (match.matchedInterests.length) return `Related interest: ${match.matchedInterests[0]}`;
  return "Review qualifications to see if this opportunity suits you";
}

export function OpportunitiesBrowser({ jobs, personalized }: { jobs: JobSummary[]; personalized: boolean }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [sector, setSector] = useState("ALL");
  const sectors = useMemo(() => [...new Set(jobs.map(job => job.sector))].sort(), [jobs]);
  const hasFilters = Boolean(search || type !== "ALL" || sector !== "ALL");
  const shown = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return jobs.filter(job =>
      (type === "ALL" || job.workType === type) &&
      (sector === "ALL" || job.sector === sector) &&
      [job.title, job.employer, job.sector, job.barangay, job.location, ...job.skills]
        .join(" ").toLocaleLowerCase().includes(query)
    );
  }, [jobs, search, type, sector]);

  function clearFilters() {
    setSearch("");
    setType("ALL");
    setSector("ALL");
  }

  return (
    <section aria-label="Explore published job opportunities" className="space-y-5">
      <div className="rounded-[22px] border border-[#dce9ef] bg-white p-4 shadow-[0_5px_22px_rgba(17,63,97,.035)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#17486a]">Explore available opportunities</h2>
            <p className="mt-1 text-sm leading-6 text-[#627f90]">Search by role, employer, location or skill.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6fa] px-3 py-2 text-xs font-bold text-[#376b88]">
            <SlidersHorizontal size={14} /> Search & filter
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#cfdfe9] bg-white px-4 focus-within:border-[#2178a4] focus-within:ring-2 focus-within:ring-[#d4ebf6]">
            <Search size={18} className="shrink-0 text-[#678a9f]" />
            <span className="sr-only">Search job opportunities</span>
            <input type="search" placeholder="Job title, employer, barangay or skill" className="w-full min-w-0 bg-transparent text-sm text-[#16476a] outline-none placeholder:text-[#819bab]" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="block">
            <span className="sr-only">Filter by employment type</span>
            <select aria-label="Filter by employment type" className="h-12 w-full rounded-xl border border-[#cfdfe9] bg-white px-3 text-sm text-[#325f79] focus:border-[#2178a4] focus:outline-none focus:ring-2 focus:ring-[#d4ebf6]" value={type} onChange={event => setType(event.target.value)}>
              <option value="ALL">All work types</option>
              {["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP"].map(item => <option key={item} value={item}>{WORK_LABEL[item]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter by sector</span>
            <select aria-label="Filter by sector" className="h-12 w-full rounded-xl border border-[#cfdfe9] bg-white px-3 text-sm text-[#325f79] focus:border-[#2178a4] focus:outline-none focus:ring-2 focus:ring-[#d4ebf6]" value={sector} onChange={event => setSector(event.target.value)}>
              <option value="ALL">All sectors</option>
              {sectors.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
          <p className="text-sm font-medium text-[#557a8e]">
            <strong className="text-[#164869]">{shown.length}</strong> of {jobs.length} available {jobs.length === 1 ? "listing" : "listings"}
            <span className="ml-2 text-xs">{personalized ? "· Suggested matches first" : "· Recently published first"}</span>
          </p>
          {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#246f97] hover:bg-[#eef7fb] focus-visible:outline-2 focus-visible:outline-[#246f97]"><X size={14} /> Clear filters</button>}
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          {shown.map(job => (
            <article key={job.id} className="flex min-w-0 flex-col rounded-[22px] border border-[#dce9f0] bg-white p-5 shadow-[0_7px_24px_rgba(15,64,101,.04)] transition hover:border-[#a9cedf] hover:shadow-[0_12px_30px_rgba(15,64,101,.08)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl border border-[#d6e8f1] bg-[#edf6fb] text-[#1e6587]"><BriefcaseBusiness size={21} /></span>
                <span className="inline-flex items-center rounded-full bg-[#e9f6f0] px-3 py-1.5 text-xs font-bold text-[#24785c]">Open listing</span>
              </div>
              <div className="mt-4 flex-1">
                <h3 className="text-[19px] font-extrabold leading-7 tracking-tight text-[#17466a]">{job.title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#53778b]">{job.employer}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#edf5fb] px-3 py-1.5 text-xs font-bold text-[#2c6685]">{job.sector}</span>
                  <span className="rounded-full bg-[#f2f5f7] px-3 py-1.5 text-xs font-bold text-[#526e82]">{WORK_LABEL[job.workType] || job.workType}</span>
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm text-[#5a7a90]"><MapPin size={16} className="mt-0.5 shrink-0" />{job.location} · {job.barangay}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5a768a]">{job.description}</p>
                {job.skills.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Listed skills">
                  {job.skills.slice(0, 3).map(skill => <span key={skill} className="rounded-md border border-[#e1eaf1] px-2.5 py-1 text-xs font-medium text-[#516f83]">{skill}</span>)}
                  {job.skills.length > 3 && <span className="px-1 text-xs font-semibold text-[#6b899d]">+{job.skills.length - 3} more</span>}
                </div>}
                {personalized && job.match && <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#ecf7f4] px-3.5 py-3 text-xs leading-5 text-[#276e60]"><Sparkles size={16} className="mt-0.5 shrink-0" /><span><strong>Suggested based on your profile.</strong> {matchDescription(job.match)}.</span></p>}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eef3] pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#668599]"><CheckCircle2 size={15} className="text-[#318a76]" /> PESO-published listing</span>
                <Link href={`/opportunities/${encodeURIComponent(job.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155778] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#0d6e94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155778]">View job details <ArrowRight size={16} /></Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#bfd5e1] bg-white p-9 text-center sm:p-12">
          <BriefcaseBusiness size={35} className="mx-auto text-[#7b9bad]" />
          <h3 className="mt-3 text-lg font-extrabold text-[#205173]">{jobs.length ? "No opportunities match your filters" : "No published opportunities yet"}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6c8a9b]">{jobs.length ? "Try a different keyword, work type, or sector." : "PESO opportunities will appear here once they are reviewed and published."}</p>
          {hasFilters && <button className="mt-5 min-h-11 rounded-xl border border-[#9fc6da] px-5 py-2 text-sm font-bold text-[#276f93] hover:bg-[#eef7fb]" type="button" onClick={clearFilters}>Show all opportunities</button>}
        </div>
      )}
    </section>
  );
}
