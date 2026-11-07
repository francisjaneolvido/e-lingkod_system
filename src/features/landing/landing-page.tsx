import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroSection } from "./sections/hero-section";
import { ServicesSection } from "./sections/services-section";
import { TrackingDemoSection } from "./sections/tracking-demo-section";
import '@/styles/visual-reference.css';
import { PersonalizedWelcomeSection } from "./sections/personalized-welcome-section";
import { RecentActivitySection } from "./sections/recent-activity-section";
import { citizenHomeSnapshot } from "./server/citizen-home";
import {hasCitizenFeatureAccess} from '@/features/identity/policy';

export type PortalViewer = { id?: string; name: string; email: string; role?: string; identityStatus?:string };

export async function LandingPage({ viewer }: { viewer: PortalViewer | null }) {
  const citizen = viewer?.role === "CITIZEN" && hasCitizenFeatureAccess({...viewer,role:viewer.role});
  const lgu = viewer?.role === "ADMIN" || viewer?.role === "STAFF";
  const citizenSnapshot = citizen && viewer?.id ? await citizenHomeSnapshot(viewer.id) : null;
  return (
    <div className="reference-portal">
      <SiteHeader viewer={viewer} />
      <main className="public-landing visual-landing">
        <HeroSection isLgu={lgu} />
        {viewer?.role==='CITIZEN'&&!citizen&&<div className="mx-auto mt-6 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 text-foreground"><p>Complete your ID submission and Admin review to use Citizen features.</p><Link href="/verification" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">View verification status</Link></div>}
        {lgu && <div role="note" className="mx-auto mt-6 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-5 py-4 text-[13px] text-foreground sm:px-8"><span><strong>LGU workspace account:</strong> You can browse public services, but reporting concerns and citizen feedback require a separate Citizen account.</span><Link href="/admin" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 font-bold text-white">Return to LGU dashboard →</Link></div>}
        {citizen && <PersonalizedWelcomeSection name={viewer!.name} snapshot={citizenSnapshot!} />}
        <ServicesSection isLgu={lgu} />
        {citizen && <RecentActivitySection />}
        <TrackingDemoSection />
        <section id="about" className="reference-about public-container" aria-labelledby="reference-about-title">
          <h2 id="reference-about-title">Kasama sa bawat hakbang.</h2>
          <div><p>Find the requirements, send the right details, and follow the recorded status. Keep your reference ID for updates.</p><Link href="/register" className="elb-button">Create an account</Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
