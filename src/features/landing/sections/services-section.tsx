"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { services, type Service, type ServiceGroup } from "../data/services";
import { ServiceDetailDialog } from "../components/service-detail-dialog";
import { ServiceTile } from "../components/service-tile";
const categories = [{ label: "All services", value: "All" }, { label: "Community", value: "Community" }, { label: "Government services", value: "Government" }, { label: "Profiling & opportunities", value: "Opportunities" }] as const;
type Category = "All" | ServiceGroup;
const searchKeywords: Record<string, string> = {
  civic: "report concern complaint kalsada baha basura streetlight picture larawan gps location geotagging tracking",
  services: "permit tax taxes clearance business license filing document application online",
  emergency: "police pnp bfp fire hospital ospital mdrrmo typhoon bagyo hotline alerts disaster call",
  directory: "guide offices opisina requirements fees bayarin directory department city hall projects ongoing future",
  jobs: "hiring employment employer business work trabaho skills vacancies jobseeker SPES survey",
  census: "worker workforce census social status employment household survey statistics data",
};
export function ServicesSection({ isLgu = false }: { isLgu?: boolean }) {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const normalizedQuery = search.trim().toLowerCase();
  const matches = useMemo(() => services.filter(service => {
    if (category !== "All" && service.group !== category) return false;
    if (!normalizedQuery) return true;
    return [service.title, service.description, service.shortTitle, service.group, searchKeywords[service.id], ...service.details.map(detail => detail.text)].join(" ").toLowerCase().includes(normalizedQuery);
  }), [category, normalizedQuery]);
  return <section id="services" aria-labelledby="services-heading" className="public-section public-service-desk"><div className="public-container">
    <div className="public-section-heading"><div><h2 id="services-heading">Ano ang kailangan mo ngayon?</h2><p>Choose a service to see the next step.</p></div><div className="public-service-search"><label htmlFor="elb-service-search">Find a service</label><div><Search size={18} aria-hidden="true" /><input id="elb-service-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Permit, report, bagyo, trabaho…" />{search && <button type="button" aria-label="Clear service search" onClick={() => setSearch("")}><X size={18} aria-hidden="true" /></button>}</div></div></div>
    <div className="public-service-filter"><div role="group" aria-label="Filter by service category">{categories.map(item => <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div><p aria-live="polite">{matches.length} of 6 services</p></div>
    <div className="public-service-grid">{matches.map(service => <ServiceTile key={service.id} service={service} onExplore={setSelected} isLgu={isLgu} />)}</div>
    {!matches.length && <div className="public-empty"><h3>No services match your search.</h3><p>Try another word or show all services.</p><button type="button" className="elb-button public-button-secondary" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button></div>}
    <p className="public-service-note">Emergency hotlines are available without an account. Public census statistics are not currently released.</p><ServiceDetailDialog service={selected} onClose={() => setSelected(null)} isLgu={isLgu} />
  </div></section>;
}
