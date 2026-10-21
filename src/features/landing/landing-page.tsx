import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroSection } from "./sections/hero-section";
import { QuickLinksSection } from "./sections/quick-links-section";
import { ServicesSection } from "./sections/services-section";
import { TrackingDemoSection } from "./sections/tracking-demo-section";
import { CommunitySection } from "./sections/community-section";
import { WorkflowSection } from "./sections/workflow-section";
import { PersonalizedWelcomeSection } from "./sections/personalized-welcome-section";
import { RecentActivitySection } from "./sections/recent-activity-section";

export type PortalViewer = { name: string; email: string; role?: string };

export function LandingPage({ viewer }: { viewer: PortalViewer | null }) {
  const citizen = viewer?.role === "CITIZEN";
  const lgu = viewer?.role === "ADMIN" || viewer?.role === "STAFF";
  return (
    <>
      <SiteHeader viewer={viewer} />
      <main>
        {/* Preserve the landing design while connecting the civic workflow. */}
        <HeroSection />
        {lgu && <div role="note" className="mx-auto mt-6 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c8e4f0] bg-[#edf7fb] px-5 py-4 text-[13px] text-[#235775] sm:px-8"><span><strong>LGU workspace account:</strong> You can browse public services, but reporting concerns and citizen feedback require a separate Citizen account.</span><Link href="/admin" className="inline-flex min-h-10 items-center rounded-xl bg-[#145578] px-4 py-2 font-bold text-white">Return to LGU dashboard →</Link></div>}
        {citizen && <PersonalizedWelcomeSection name={viewer!.name} />}
        <QuickLinksSection isLgu={lgu} />
        <ServicesSection isLgu={lgu} />
        {citizen && <RecentActivitySection />}
        <TrackingDemoSection />
        <CommunitySection />
        <WorkflowSection />
      </main>
      <SiteFooter />
    </>
  );
}
