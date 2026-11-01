import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Landmark,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";

type AuthShellProps = {
  children: ReactNode;
  page: "login" | "register";
};

/**
 * Shared, desktop-first authentication layout.
 * Design references the eLB brand rather than using any other city's seal.
 * On mobile, the graphic panel becomes a short masthead above the form.
 */
export function AuthShell({ children, page }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,1.06fr)_minmax(440px,0.94fr)]">
      {/* Pastel-blue branded illustration panel */}
      <aside className="relative isolate flex min-h-[250px] flex-col overflow-hidden bg-muted text-foreground lg:min-h-screen">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-[-14rem] size-[500px] rounded-full bg-card/65 blur-3xl" />
          <div className="absolute bottom-[-18rem] right-[-10rem] size-[550px] rounded-full bg-muted/35 blur-3xl" />
          <div className="absolute right-[8%] top-[10%] hidden size-24 rounded-full border border-white/65 xl:block" />
          <div className="absolute right-[8%] top-[10%] hidden size-36 -translate-x-6 -translate-y-6 rounded-full border border-white/50 xl:block" />
          <Image src="/images/elb-mark.svg" alt="" width={142} height={162} className="absolute -left-8 top-[23%] hidden rotate-[-18deg] opacity-[0.09] md:block" />
          <Image src="/images/elb-mark.svg" alt="" width={130} height={148} className="absolute right-9 top-[39%] hidden rotate-[16deg] opacity-[0.08] md:block" />
          <Image src="/images/elb-mark.svg" alt="" width={104} height={118} className="absolute bottom-[13%] left-[23%] hidden rotate-[-12deg] opacity-[0.07] lg:block" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[860px] items-center justify-between px-6 pt-5 sm:px-10 sm:pt-7 lg:px-12 lg:pt-11 2xl:px-20">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-card/60 px-3.5 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-xs font-bold tracking-[0.04em] text-foreground sm:inline-flex">
            <span className="size-1.5 rounded-full bg-success-solid" /> E-LINGKOD BAYAN
          </span>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-7 pt-7 text-center sm:px-12 lg:pb-20 lg:pt-8 2xl:pb-24">
          <div className="relative mb-2 hidden items-center justify-center lg:flex">
            <span className="absolute size-[154px] rounded-full border border-white/70 bg-card/20 shadow-[0_0_0_20px_rgba(255,255,255,0.11)]" />
            <div className="relative grid size-[122px] place-items-center rounded-full bg-card/80 shadow-[0_14px_55px_rgba(47,124,167,0.12)] backdrop-blur-md">
              <Image src="/images/elb-mark.svg" alt="eLB community emblem" width={81} height={92} className="h-[92px] w-auto" priority />
            </div>
          </div>

          <div className="mb-1 flex items-center gap-3 lg:hidden">
            <Image src="/images/elb-mark.svg" alt="eLB community emblem" width={48} height={55} className="h-[52px] w-auto" priority />
            <div className="text-left">
              <p className="text-[25px] font-extrabold leading-none tracking-[-0.06em] text-foreground">eLB</p>
              <p className="mt-1 text-xs font-bold tracking-[-0.02em] text-foreground">eLingkod Bayan</p>
            </div>
          </div>

          <span className="mt-7 hidden items-center gap-2 rounded-full border border-white/80 bg-card/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground lg:inline-flex">
            <Sparkles size={13} className="text-warning-foreground" /> One community. One digital portal.
          </span>

          <h1 className="mt-3 text-[clamp(27px,3.15vw,59px)] font-extrabold leading-[1.16] tracking-[-0.065em] text-foreground lg:mt-7">
            Serbisyong bayan,<br className="hidden lg:block" />
            <span className="relative ml-1 inline-block text-foreground lg:ml-0">
              mas malapit sa’yo.
              <svg aria-hidden="true" className="absolute -bottom-2 left-0 h-3 w-full overflow-visible" viewBox="0 0 420 14" preserveAspectRatio="none"><path d="M5 10Q207 -4 415 9" fill="none" stroke="#ffb92d" strokeWidth="7" strokeLinecap="round" /></svg>
            </span>
          </h1>

          <div className="mt-6 hidden items-center gap-3 lg:flex">
            <span className="h-px w-9 bg-accent" />
            <span className="text-xs font-semibold tracking-[0.16em] text-foreground">REPORT · ACT · RESOLVE</span>
            <span className="h-px w-9 bg-accent" />
          </div>

          <p className="mt-7 hidden max-w-[490px] text-sm leading-7 text-muted-foreground lg:block 2xl:text-[15px]">
            {page === "login"
              ? "Your gateway to community reporting, government services, and opportunities — accessible wherever you are."
              : "Create your citizen account and take the first step towards faster, more connected community services."}
          </p>

          <div className="mt-10 hidden flex-wrap justify-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-card/60 px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm"><MapPinned size={14} className="text-muted-foreground" /> Community reporting</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-card/60 px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm"><Landmark size={14} className="text-muted-foreground" /> Online services</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/85 bg-card/60 px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm"><CheckCircle2 size={14} className="text-success" /> Easy tracking</span>
          </div>
        </div>

        {/* Low-contrast municipal skyline motif — original vector, not a real city seal */}
        <svg aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 hidden h-[170px] w-full text-muted-foreground/[0.13] lg:block" viewBox="0 0 900 180" preserveAspectRatio="xMidYMax slice" fill="currentColor">
          <path d="M0 146h88v-35h16V76h42v35h16v35h45V97h26V67h29v30h26v49h48v-31h22v-24h44v24h24v31h70V88h20V53h15V29h12v24h15v35h21v58h65v-34h20V82h35v30h19v34h83V98h17V65h42v33h16v48h73v34H0z" />
          <path d="M445 83l46-32 46 32v8h-92z" />
          <path d="M488 16h8v25h-8z" />
        </svg>
        <div className="relative hidden items-center justify-between border-t border-white/55 px-12 py-6 text-xs text-muted-foreground lg:flex 2xl:px-20">
          <span>eLB — Digital public services</span>
          <span>Hackathon concept · 2026</span>
        </div>
      </aside>

      {/* Spacious card-free sign-in area */}
      <section className="relative flex min-h-[620px] flex-col items-center justify-center bg-card px-5 py-11 sm:px-10 lg:min-h-screen lg:px-12 lg:py-12 2xl:px-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-[-170px] top-[-220px] size-[460px] rounded-full bg-muted/65 blur-[95px]" />
          <div className="absolute bottom-[-250px] left-[-210px] size-[480px] rounded-full bg-muted/70 blur-[95px]" />
        </div>
        <div className="relative z-10 w-full max-w-[425px] lg:max-w-[430px]">
          <div className="mb-7 flex items-center justify-center lg:mb-9">
            <BrandLogo />
          </div>
          {children}
          <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
            <ShieldCheck size={14} className="shrink-0 text-muted-foreground" /> Hackathon prototype · Protected account sign-in
          </div>
          <Link href="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
            Visit the E-Lingkod Bayan homepage <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
    </main>
  );
}
