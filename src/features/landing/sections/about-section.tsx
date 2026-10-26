import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Smartphone } from "lucide-react";

export function AboutSection() {
  return <section id="about" className="scroll-mt-24 bg-card px-5 py-18 sm:px-8 sm:py-24 lg:py-28 xl:px-12 2xl:px-16">
    <div className="mx-auto max-w-[1312px]">
      <div className="relative overflow-hidden rounded-[28px] bg-primary px-6 py-12 text-white sm:px-12 sm:py-14 lg:px-16 lg:py-18">
        <div className="pointer-events-none absolute -right-15 -top-50 h-[490px] w-[490px] rounded-full border-[70px] border-white/5" aria-hidden="true"/>
        <div className="pointer-events-none absolute bottom-[-160px] right-[14%] h-[420px] w-[420px] rounded-full border-[45px] border-border/10" aria-hidden="true" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_0.8fr] lg:gap-16">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-on-brand-gold"><span className="h-[3px] w-7 rounded-full bg-brand-gold"/> Better together</p>
            <h2 className="mt-5 max-w-2xl text-[clamp(2rem,3.2vw,3.35rem)] font-extrabold leading-[1.19] tracking-[-0.045em]">A stronger community starts with a better connection.</h2>
            <p className="mt-5 max-w-xl text-[13px] leading-8 text-on-brand-muted sm:text-sm">E-Lingkod Bayan is a hackathon concept for a more connected, responsive, and inclusive public-service experience. We believe accessible information can help communities take meaningful action.</p>
            <Link href="#services" className="mt-7 inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-brand-gold px-6 text-[12px] font-extrabold text-on-gold transition hover:bg-brand-gold">Discover the services <ArrowRight size={17}/></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-card/10 p-4 backdrop-blur-sm"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card/15"><Smartphone size={20} className="text-on-brand-gold"/></div><div><h3 className="text-[12px] font-bold">Accessible by design</h3><p className="mt-1 text-xs text-on-brand-muted">Desktop, tablet & mobile web</p></div></div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-card/10 p-4 backdrop-blur-sm"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card/15"><ShieldCheck size={20} className="text-on-brand-gold"/></div><div><h3 className="text-[12px] font-bold">Transparent by intent</h3><p className="mt-1 text-xs text-on-brand-muted">Clear reporting & follow-ups</p></div></div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-card/10 p-4 backdrop-blur-sm"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card/15"><HeartHandshake size={20} className="text-on-brand-gold"/></div><div><h3 className="text-[12px] font-bold">Built for people</h3><p className="mt-1 text-xs text-on-brand-muted">Community-first experiences</p></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
