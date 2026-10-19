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

export type PortalViewer = { name: string; email: string };

export function LandingPage({ viewer }: { viewer: PortalViewer | null }) {
  return (
    <>
      <SiteHeader viewer={viewer} />
      <main>
        {/* Keep the original Hero V4 and Services V5 unchanged. */}
        <HeroSection />
        {viewer && <PersonalizedWelcomeSection name={viewer.name} />}
        <QuickLinksSection />
        <ServicesSection />
        {viewer && <RecentActivitySection />}
        <TrackingDemoSection />
        <CommunitySection />
        <WorkflowSection />
      </main>
      <SiteFooter />
    </>
  );
}
