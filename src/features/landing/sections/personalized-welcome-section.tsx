import Link from "next/link";
import { ArrowRight, CircleUserRound, ClipboardList, Files, ShieldCheck } from "lucide-react";

export function PersonalizedWelcomeSection({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] || "Citizen";

  return (
    <section aria-labelledby="citizen-welcome-title" className="border-b border-[#e0eaf2] bg-[#f2f8fd] px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto grid max-w-[1344px] gap-7 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.13em] text-[#1b729e]">
            <ShieldCheck size={16} /> Your citizen portal
          </p>
          <h2 id="citizen-welcome-title" className="mt-3 text-[clamp(1.65rem,3vw,2.5rem)] font-extrabold tracking-[-.045em] text-[#153b63]">
            Welcome back, {firstName}!
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-7 text-[#5c7890]">
            You&apos;re signed in. Explore the same E-Lingkod Bayan services, and manage your account in one place.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/#services" className="inline-flex items-center gap-2 rounded-full bg-[#153b63] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#236b9d]">
              Explore services <ArrowRight size={16} />
            </Link>
            <Link href="/account" className="inline-flex items-center gap-2 rounded-full border border-[#c5d9e8] bg-white px-5 py-3 text-[12px] font-bold text-[#153b63] transition hover:bg-[#e7f2fa]">
              <CircleUserRound size={16} /> My account
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3" aria-label="Planned account modules">
          <Link href="/reports" className="rounded-2xl border border-[#dbe8f1] bg-white p-5 shadow-[0_9px_25px_rgba(15,62,102,0.04)] transition hover:border-[#7eafc8]">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#EDF5FB] text-[#153B63]"><ClipboardList size={22} strokeWidth={1.8}/></span>
            <h3 className="mt-4 text-[13px] font-extrabold text-[#153b63]">My reports</h3>
            <p className="mt-1 text-[11px] leading-5 text-[#668198]">Open your concerns and progress updates <ArrowRight size={12} className="inline" /></p>
          </Link>
          <div className="rounded-2xl border border-[#dbe8f1] bg-white p-5 shadow-[0_9px_25px_rgba(15,62,102,0.04)]">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#EDF5FB] text-[#153B63]"><Files size={22} strokeWidth={1.8}/></span>
            <h3 className="mt-4 text-[13px] font-extrabold text-[#153b63]">Applications</h3>
            <p className="mt-1 text-[11px] leading-5 text-[#668198]">Online applications coming next</p>
          </div>
        </div>
      </div>
    </section>
  );
}
