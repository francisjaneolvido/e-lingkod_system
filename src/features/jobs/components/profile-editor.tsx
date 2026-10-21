"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, Save, Trash2 } from "lucide-react";
import {
  EDUCATION, EDUCATION_LABEL, INTERESTS, SKILLS,
  WORK_LABEL, WORK_TYPES, type MatchProfile,
} from "../domain";

function TagSelector({ label, helper, items, selected, max, onChange }: {
  label: string;
  helper: string;
  items: readonly string[];
  selected: string[];
  max: number;
  onChange: (items: string[]) => void;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-extrabold text-[#1e4c6b]">{label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm leading-6 text-[#627f90]">{helper}</p>
        <span className="rounded-full bg-[#edf5fa] px-3 py-1.5 text-xs font-bold text-[#416d83]">{selected.length}/{max} selected</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const checked = selected.includes(item);
          const limitReached = !checked && selected.length >= max;
          return (
            <label key={item} className={`inline-flex min-h-10 items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-[#4799bb] ${checked ? "border-[#4f9abb] bg-[#eaf6fb] text-[#166084]" : "border-[#d7e5ec] bg-white text-[#56768c]"} ${limitReached ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:border-[#91bed3]"}`}>
              <input type="checkbox" className="sr-only" checked={checked} disabled={limitReached} onChange={event => onChange(event.target.checked ? [...selected, item] : selected.filter(value => value !== item))} />
              {item}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProfileEditor({ initial }: { initial: MatchProfile | null }) {
  const router = useRouter();
  const [skills, setSkills] = useState(initial?.skills || []);
  const [interests, setInterests] = useState(initial?.interests || []);
  const [education, setEducation] = useState(initial?.education || "SENIOR_HIGH");
  const [preferredArea, setPreferredArea] = useState(initial?.preferredArea || "");
  const [availability, setAvailability] = useState(initial?.availability || "ANY");
  const [busy, setBusy] = useState(false);
  const [hasSaved, setHasSaved] = useState(Boolean(initial));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(method: "PUT" | "DELETE") {
    if (method === "DELETE" && !window.confirm("Delete your optional skills profile and matching preferences?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/jobs/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method === "PUT" ? { body: JSON.stringify({ skills, interests, education, preferredArea, availability }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not update your matching preferences.");
      if (method === "DELETE") {
        router.push("/opportunities");
      } else {
        setHasSaved(true);
        setNotice("Preferences saved. Job suggestions will reflect your updated profile.");
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#277494] hover:underline"><ArrowLeft size={17} /> Back to job opportunities</Link>
      <section className="overflow-visible rounded-[24px] border border-[#dce9ef] bg-white px-5 py-6 sm:px-8 sm:py-8">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#277d97]"><LockKeyhole size={15} /> Private & optional</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#184668]">My skills & interests</h1>
        <p className="mt-3 max-w-[700px] text-sm leading-7 text-[#5b7d91]">Choose what describes you to improve your job suggestions. This information is not sent to employers or included in SPES survey imports. You can update or delete it anytime.</p>

        <div className="mt-8 space-y-8">
          <div className="rounded-2xl border border-[#e1eaf0] p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-[#38829e]">01 · About you</p>
            <TagSelector label="My skills" helper="Select up to 12 skills you can demonstrate." items={SKILLS} selected={skills} max={12} onChange={setSkills} />
          </div>
          <div className="rounded-2xl border border-[#e1eaf0] p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-[#38829e]">02 · Work interests</p>
            <TagSelector label="Areas I want to explore" helper="Select up to 5 sectors or work interests." items={INTERESTS} selected={interests} max={5} onChange={setInterests} />
          </div>
          <div className="rounded-2xl border border-[#e1eaf0] p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-[#38829e]">03 · Preferences</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-extrabold text-[#315f79]">Education level
                <select className="mt-2 block h-12 w-full rounded-xl border border-[#cfe1e9] bg-white px-3 text-sm font-medium text-[#345e77] focus:border-[#3486ad] focus:outline-none focus:ring-2 focus:ring-[#d8ebf4]" value={education} onChange={event => setEducation(event.target.value)}>
                  {EDUCATION.filter(value => value !== "ANY").map(value => <option value={value} key={value}>{EDUCATION_LABEL[value]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-extrabold text-[#315f79]">Preferred work schedule
                <select className="mt-2 block h-12 w-full rounded-xl border border-[#cfe1e9] bg-white px-3 text-sm font-medium text-[#345e77] focus:border-[#3486ad] focus:outline-none focus:ring-2 focus:ring-[#d8ebf4]" value={availability} onChange={event => setAvailability(event.target.value)}>
                  {["ANY", ...WORK_TYPES].map(value => <option value={value} key={value}>{WORK_LABEL[value]}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-5 block text-sm font-extrabold text-[#315f79]">Preferred barangay / area (optional)
              <input className="mt-2 block h-12 w-full rounded-xl border border-[#cfe1e9] px-4 text-sm font-medium text-[#345e77] placeholder:text-[#90a6b2] focus:border-[#3486ad] focus:outline-none focus:ring-2 focus:ring-[#d8ebf4]" maxLength={100} value={preferredArea} onChange={event => setPreferredArea(event.target.value)} placeholder="e.g. Poblacion" />
            </label>
            <p className="mt-3 text-xs leading-5 text-[#768e9d]">Education and experience are not used to verify job eligibility. Always review the employer’s stated requirements.</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</p>}
        <div className="sticky bottom-0 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce9ef] bg-white/95 p-3 shadow-[0_-10px_30px_rgba(16,59,89,.07)] backdrop-blur-sm sm:px-5">
          <button type="button" disabled={busy || !hasSaved} onClick={() => save("DELETE")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /> Delete profile</button>
          <button type="button" disabled={busy || (!skills.length && !interests.length)} onClick={() => save("PUT")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155778] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#0d7098] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155778] disabled:cursor-not-allowed disabled:opacity-40"><Save size={16} />{busy ? "Saving..." : "Save preferences"}</button>
        </div>
      </section>
    </div>
  );
}
