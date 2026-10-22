import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Construction, ShieldCheck } from "lucide-react";
import { requireModulePage } from "@/lib/access";

export const instant = false;
export const metadata: Metadata = { title: "Community Census | eLingkod Bayan" };

export default async function CensusAdminPage() {
  await requireModulePage("/admin/census", "CENSUS");
  return <div className="space-y-6">
    <section className="rounded-[22px] border border-[#dce8ee] bg-[linear-gradient(120deg,#eef8fc,#fff_70%,#f8fbf9)] p-7 sm:p-9">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ec] bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#4a7f98]"><Construction size={14}/> Planned module</span>
      <div className="mt-5 grid size-12 place-items-center rounded-2xl bg-[#e8f3f8] text-[#236f91]"><BarChart3 size={24}/></div>
      <h1 className="mt-5 text-2xl font-black tracking-tight text-[#143f61] sm:text-3xl">Community Census</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#678394]">This module is intentionally empty for now. The employment survey, skills and training profiling, livelihood analytics, historical activity data and opportunity recommendations are managed under <strong>Job Matching / Employment & Livelihood</strong>, not Census.</p>
    </section>
    <section className="rounded-[20px] border border-[#dce7ed] bg-white p-6">
      <p className="flex items-start gap-2 text-sm leading-6 text-[#668293]"><ShieldCheck size={17} className="mt-0.5 shrink-0"/> Keeping Census separate prevents employment survey records from being presented as official census data.</p>
      <Link href="/admin/jobs/insights" className="mt-5 inline-flex rounded-xl bg-[#175e7d] px-4 py-3 text-sm font-extrabold text-white">Open Job Matching insights</Link>
    </section>
  </div>;
}
