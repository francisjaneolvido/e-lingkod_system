import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Building2 } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { hasCitizenFeatureAccess } from "@/features/identity/policy";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SERVICE_CATEGORIES } from "@/features/services/catalog";
import { publishedServiceCatalog } from "@/features/services/server/catalog";

export const instant = false;
export const metadata: Metadata = { title: "Online LGU Services | eLingkod Bayan" };
export default async function ServicesPage() {
  await connection();
  const viewer = await currentViewer();
  const catalog = await publishedServiceCatalog();
  const citizen = viewer?.role === "CITIZEN" && hasCitizenFeatureAccess(viewer);
  return <><SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role, identityStatus: viewer.identityStatus } : null} /><main className="public-page">
    <header className="public-page-masthead"><div className="public-container"><div><p className="public-context"><Building2 size={18} aria-hidden="true" /> Online LGU Services</p><h1>Find the service.<br />Know your next step.</h1><p>Choose a service to check its requirements and processing office. Complete the relevant form, send your documents and follow updates in one request timeline.</p></div><div className="public-actions">{citizen && <Link href="/services/requests" className="elb-button elb-button-primary">My LGU requests</Link>}<Link href="#catalog" className="elb-button public-button-secondary">Browse services <ArrowRight size={17} aria-hidden="true" /></Link></div></div></header>
    <section id="catalog" className="public-container scroll-mt-24" aria-labelledby="catalog-title"><div className="public-section-heading"><div><h2 id="catalog-title">What do you need today?</h2><p>Check the service guide before starting your request.</p></div><p>{catalog.length} available services</p></div>
      {SERVICE_CATEGORIES.map(category => { const entries = catalog.filter(service => service.category === category); return entries.length ? <section key={category} className="public-catalog-category"><h3>{category}</h3><div className="public-catalog-grid">{entries.map(service => { const Icon = service.icon; return <Link key={service.key} href={`/services/${service.key}`} className="public-catalog-entry"><Icon size={24} aria-hidden="true" /><div><span className="public-intake">{service.intakeMode === "PRESCREEN" ? "Screening first" : "Start online"}</span><h4>{service.title}</h4><p>{service.description}</p><small>{service.processingOffice}</small></div><ArrowRight size={18} aria-hidden="true" /></Link>; })}</div></section> : null; })}
      {!catalog.length && <div className="public-empty"><h3>No services are published yet.</h3><p>Check again later or use the office directory for contact details.</p><Link href="/projects?tab=offices" className="elb-button public-button-secondary">Find an office</Link></div>}
      <aside className="public-access-note"><h2>Already sent a request?</h2><p>Open My LGU requests in your Citizen account to review corrections, schedules, documents and the latest recorded status.</p></aside>
    </section>
  </main><SiteFooter /></>;
}
