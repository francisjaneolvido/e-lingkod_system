import Link from "next/link";
import { ArrowUpRight, Camera, Files, BookOpenText, BriefcaseBusiness } from "lucide-react";

const actions = [
  { label: "Mag-report", detail: "Photo, location & tracking", icon: Camera, href: "/reports/new" },
  { label: "Mag-apply", detail: "Permits & clearances", icon: Files, href: "/#service-services" },
  { label: "Maghanap ng office", detail: "Directory & guides", icon: BookOpenText, href: "/#service-directory" },
  { label: "Maghanap ng trabaho", detail: "Local opportunities", icon: BriefcaseBusiness, href: "/opportunities" },
];

export function QuickLinksSection({ isLgu = false }: { isLgu?: boolean }) {
  return <section aria-labelledby="quick-links-title" className="relative z-10 border-b border-[#e5edf2] bg-white px-5 py-10 sm:px-8 lg:px-12 lg:py-11">
    <div className="mx-auto max-w-[1344px]">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><h2 id="quick-links-title" className="text-[17px] font-extrabold tracking-tight text-[#153f65] sm:text-[20px]">Saan ka namin matutulungan?</h2><span className="text-[11px] font-medium text-[#758da1]">Explore what eLB is being built to offer</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(item=><Link key={item.label} href={isLgu && item.href === "/reports/new" ? "/admin" : item.href} className="group flex items-center gap-3.5 rounded-2xl border border-[#dfeaf2] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#9bc8e3] hover:bg-[#f8fcff] hover:shadow-[0_13px_26px_rgba(20,70,108,0.07)]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-[#eaf4fd] text-[#196fa8]"><item.icon size={23} strokeWidth={1.8}/></span>
          <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-[#193e63]">{isLgu && item.href === "/reports/new" ? "LGU workspace" : item.label}</span><span className="mt-0.5 block text-[10px] text-[#7790a3]">{isLgu && item.href === "/reports/new" ? "View your assigned LGU tasks" : item.detail}</span></span>
          <ArrowUpRight size={16} className="shrink-0 text-[#7297b1] transition group-hover:text-[#1769a5]"/>
        </Link>)}
      </div>
    </div>
  </section>;
}
