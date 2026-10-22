import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, BellRing, BriefcaseBusiness, Building2,
  CheckCircle2, ClipboardList, Construction, MapPinned, ShieldCheck,
  UsersRound,
} from "lucide-react";
import { requireModulePage } from "@/lib/access";
import type { StaffModule } from "@/lib/staff-modules";

export const instant = false;
export const metadata: Metadata = { title: "LGU Modules | E-Lingkod Bayan" };

const modules = {
  services: { index: "02", name: "Online LGU Services", icon: Building2, summary: "Bring permits, clearances, IDs, and other service requests closer to residents.", steps: ["Citizen application and document upload", "LGU review, assignment and approval", "Application status tracking and updates"] },
  emergency: { index: "03", name: "Emergency Hotlines & Alerts", icon: BellRing, summary: "One trusted place to find verified local emergency contacts and public advisories.", steps: ["Verified PNP, BFP, hospital, and MDRRMO contacts", "One-tap calling on supported devices", "Authorized LGU advisory publishing"] },
  projects: { index: "04", name: "Municipal Projects & Services", icon: MapPinned, summary: "Improve visibility into municipal offices, public services, and projects.", steps: ["LGU office and service directory", "Upcoming and ongoing project listings", "Project progress and milestones from the LGU"] },
  jobs: { index: "05", name: "Job Matching & Employment", icon: BriefcaseBusiness, summary: "Combine employment profiling, skills and training insights, and verified opportunity discovery without turning the portal into a job application system.", steps: ["Adaptive employment and livelihood survey", "Skills, training, barriers and historical activity insights", "PESO-managed opportunity publishing and informational recommendations"] },
  census: { index: "06", name: "Community Census", icon: UsersRound, summary: "A separate census module reserved for a future implementation phase.", steps: ["Define census scope and methodology", "Design authorized census collection and validation", "Publish privacy-safe census statistics when officially implemented"] },
} as const;

export function generateStaticParams() { return Object.keys(modules).map(module => ({module})); }
const moduleKeys: Record<keyof typeof modules, StaffModule> = { services: "SERVICES", emergency: "EMERGENCY", projects: "PROJECTS", jobs: "JOBS", census: "CENSUS" };

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!(module in modules)) notFound();
  await requireModulePage(`/admin/${module}`, moduleKeys[module as keyof typeof modules]);
  const item = modules[module as keyof typeof modules];
  const Icon = item.icon;

  return <div className="space-y-5">
    <Link href="/admin" className="inline-flex items-center gap-2 rounded-md text-[12px] font-bold text-[#28779b] hover:underline"><ArrowLeft size={16}/> Back to overview</Link>
    <section className="relative overflow-hidden rounded-[20px] border border-[#dce8ee] bg-[linear-gradient(115deg,#f0f8fb,#fff_70%,#fefaf0)] p-6 sm:p-9">
      <span aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border-[28px] border-[#d8ecf4]/60" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-[15px] border border-[#d2e6ed] bg-white text-[#286f96]"><Icon size={27}/></span><div><p className="text-[10px] font-bold tracking-[.16em] text-[#2d7d9d]">SERVICE MODULE {item.index}</p><h1 className="mt-2 max-w-2xl text-[25px] font-extrabold tracking-[-.035em] text-[#123d5f] sm:text-[30px]">{item.name}</h1><p className="mt-3 max-w-2xl text-[13px] leading-7 text-[#678499]">{item.summary}</p></div></div><span className="inline-flex items-center gap-2 rounded-full border border-[#dfecf0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#657f90]"><Construction size={15}/> Under development</span></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,1fr)]">
      <section className="rounded-[18px] border border-[#e0e9ef] bg-white p-6 sm:p-7"><h2 className="text-[16px] font-extrabold text-[#164262]">Planned workflow</h2><p className="mt-2 text-[12px] text-[#8197a6]">Proposed capabilities for the next implementation phase.</p><ol className="mt-6 space-y-5">{item.steps.map((step, index) => <li key={step} className="flex items-start gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e9f4fa] text-[12px] font-extrabold text-[#21749a]">{String(index + 1).padStart(2, "0")}</span><div className="border-b border-[#edf1f4] pb-4 text-[13px] font-semibold leading-6 text-[#476a81] last:border-b-0">{step}</div></li>)}</ol></section>
      <section className="rounded-[18px] border border-[#e0e9ef] bg-white p-6 sm:p-7"><span className="grid size-11 place-items-center rounded-xl bg-[#e9f7f2] text-[#228e76]"><ShieldCheck size={22}/></span><h2 className="mt-4 text-[16px] font-extrabold text-[#164262]">Prototype transparency</h2><p className="mt-2 text-[12px] leading-7 text-[#7893a4]">This module is a roadmap preview, not an active government service. No applications, contact records, job listings, or census responses are collected on this screen.</p><Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#164f75] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#0d698d]"><CheckCircle2 size={16}/> Return to my workspace <ArrowUpRight size={15}/></Link></section>
    </div>
    <p className="flex items-center gap-2 text-[11px] text-[#8b9daa]"><ClipboardList size={14}/> Future module content is intentionally labeled as planned to avoid misleading demo data.</p>
  </div>;
}
