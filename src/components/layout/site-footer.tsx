import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

export function SiteFooter() {
  return <footer className="public-footer"><div className="public-container">
    <div className="public-footer-grid"><div><BrandLogo /><p>Report. Act. Resolve.<br />A clearer way to find community services and follow your next step.</p></div>
      <div><h2>Services</h2><nav aria-label="Footer services"><Link href="/reports/new">Report a concern</Link><Link href="/services">Online LGU services</Link><Link href="/track">Track a report</Link><Link href="/emergency">Emergency hotlines</Link></nav></div>
      <div><h2>Community</h2><nav aria-label="Footer community"><Link href="/projects?tab=offices">Office directory</Link><Link href="/projects">Municipal projects</Link><Link href="/community-employment">Citizen Profiling</Link><Link href="/opportunities">Opportunities</Link></nav></div>
    </div><div className="public-footer-bottom"><span>© 2026 eLB — E-Lingkod Bayan</span><span>Check each service for requirements and availability.</span></div>
  </div></footer>;
}
