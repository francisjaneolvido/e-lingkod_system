import Link from "next/link";
import { ArrowUpRight, HeartHandshake, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return <footer className="bg-primary text-white">
    <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-14">
      <div className="grid gap-11 border-b border-white/15 pb-10 md:grid-cols-[1.4fr_1fr_1fr] lg:gap-20">
        <div><BrandLogo inverted/><p className="mt-5 max-w-sm text-[13px] leading-7 text-white/75">Report. Act. Resolve. Isang mas accessible na paraan para mag-connect ang komunidad at mga public services.</p><div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-white/75"><ShieldCheck size={14}/> Educational hackathon prototype only</div></div>
        <div><h3 className="text-xs font-extrabold uppercase tracking-[0.13em] text-on-brand-gold">Explore</h3><div className="mt-5 flex flex-col items-start gap-3">{siteConfig.nav.map(item => <Link key={item.href} href={item.href} className="text-[12px] text-white/75 transition hover:text-white">{item.label}</Link>)}</div></div>
        <div><h3 className="text-xs font-extrabold uppercase tracking-[0.13em] text-on-brand-gold">For the community</h3><div className="mt-5 flex items-start gap-3 text-[12px] leading-6 text-white/75"><HeartHandshake size={19} className="mt-1 shrink-0 text-on-brand-gold"/><span>Built as a citizen-centered prototype. Civic Reporting, Online LGU Services, and PESO opportunities now have working prototype flows; other service modules remain planned.</span></div><Link href="/#services" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-white hover:text-on-brand-gold">Explore services <ArrowUpRight size={15}/></Link></div>
      </div>
      <div className="flex flex-col justify-between gap-3 pt-7 text-xs text-white/60 sm:flex-row sm:items-center"><span>© 2026 eLB — E-Lingkod Bayan · Hackathon concept</span><span className="inline-flex items-center gap-2"><Mail size={13}/> Contact details will be added after partner verification.</span></div>
    </div>
  </footer>;
}
