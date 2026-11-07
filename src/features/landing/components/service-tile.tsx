import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Service } from "../data/services";
type Props = { service: Service; onExplore: (service: Service) => void; isLgu?: boolean };
const entries: Record<string, { description: string; href: string; action: string }> = {
  civic: { description: "Send a photo and location, then follow the recorded LGU response.", href: "/reports/new", action: "Report a concern" },
  services: { description: "Find permits, clearances and assistance with their requirements and next steps.", href: "/services", action: "Browse services" },
  emergency: { description: "Call source-backed emergency contacts and read published advisories.", href: "/emergency", action: "Open hotlines" },
  directory: { description: "Find office contacts and source-backed municipal project disclosures.", href: "/projects", action: "Projects & offices" },
  jobs: { description: "Share skills and training interests, or browse reviewed opportunities.", href: "/community-employment", action: "Profiling & opportunities" },
  census: { description: "Learn about protected census records and access. Public statistics are pending.", href: "/community-census", action: "About census access" },
};
export function ServiceTile({ service, onExplore, isLgu = false }: Props) {
  const entry = entries[service.id];
  const Icon = service.icon;
  const href = isLgu ? ({ civic: "/admin", services: "/admin/services", jobs: "/admin/jobs", census: "/admin/census" } as Record<string, string>)[service.id] ?? entry.href : entry.href;
  const action = isLgu && ["civic", "services", "jobs", "census"].includes(service.id) ? "Open LGU workspace" : entry.action;
  return <article id={`service-${service.id}`} className="public-service-entry"><span className="public-service-icon"><Icon size={24} strokeWidth={1.7} aria-hidden="true" /></span><div className="public-service-entry-content"><h3>{service.id === "jobs" ? "Citizen Profiling & opportunities" : service.title}</h3><p>{entry.description}</p><div className="public-service-entry-actions"><Link href={href}>{action}<ArrowUpRight size={17} aria-hidden="true" /></Link><button type="button" onClick={() => onExplore(service)} aria-label={`See ${service.title} details`}>Details</button></div></div></article>;
}
