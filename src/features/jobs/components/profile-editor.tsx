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
      <legend className="text-base font-extrabold text-foreground">{label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">{selected.length}/{max} selected</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const checked = selected.includes(item);
          const limitReached = !checked && selected.length >= max;
          return (
            <label key={item} className={`inline-flex min-h-10 items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-border ${checked ? "border-border bg-muted text-foreground" : "border-border bg-card text-muted-foreground"} ${limitReached ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:border-border"}`}>
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
      <Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-foreground hover:underline"><ArrowLeft size={17} /> Back to job opportunities</Link>
      <section className="overflow-visible rounded-[24px] border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground"><LockKeyhole size={15} /> Private & optional</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">My skills & interests</h1>
        <p className="mt-3 max-w-[700px] text-sm leading-7 text-muted-foreground">Choose what describes you to improve your job suggestions. This information is not sent to employers or included in SPES survey imports. You can update or delete it anytime.</p>

        <div className="mt-8 space-y-8">
          <div className="rounded-2xl border border-border p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">01 · About you</p>
            <TagSelector label="My skills" helper="Select up to 12 skills you can demonstrate." items={SKILLS} selected={skills} max={12} onChange={setSkills} />
          </div>
          <div className="rounded-2xl border border-border p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">02 · Work interests</p>
            <TagSelector label="Areas I want to explore" helper="Select up to 5 sectors or work interests." items={INTERESTS} selected={interests} max={5} onChange={setInterests} />
          </div>
          <div className="rounded-2xl border border-border p-4 sm:p-6">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">03 · Preferences</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-extrabold text-foreground">Education level
                <select className="mt-2 block h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-border focus:outline-none focus:ring-2 focus:ring-border" value={education} onChange={event => setEducation(event.target.value)}>
                  {EDUCATION.filter(value => value !== "ANY").map(value => <option value={value} key={value}>{EDUCATION_LABEL[value]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-extrabold text-foreground">Preferred work schedule
                <select className="mt-2 block h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-border focus:outline-none focus:ring-2 focus:ring-border" value={availability} onChange={event => setAvailability(event.target.value)}>
                  {["ANY", ...WORK_TYPES].map(value => <option value={value} key={value}>{WORK_LABEL[value]}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-5 block text-sm font-extrabold text-foreground">Preferred barangay / area (optional)
              <input className="mt-2 block h-12 w-full rounded-xl border border-border px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none focus:ring-2 focus:ring-border" maxLength={100} value={preferredArea} onChange={event => setPreferredArea(event.target.value)} placeholder="e.g. Poblacion" />
            </label>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Education and experience are not used to verify job eligibility. Always review the employer’s stated requirements.</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{notice}</p>}
        <div className="sticky bottom-0 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-[0_-10px_30px_rgba(16,59,89,.07)] backdrop-blur-sm sm:px-5">
          <button type="button" disabled={busy || !hasSaved} onClick={() => save("DELETE")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-destructive transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /> Delete profile</button>
          <button type="button" disabled={busy || (!skills.length && !interests.length)} onClick={() => save("PUT")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border disabled:cursor-not-allowed disabled:opacity-40"><Save size={16} />{busy ? "Saving..." : "Save preferences"}</button>
        </div>
      </section>
    </div>
  );
}
