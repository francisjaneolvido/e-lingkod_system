"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BellRing, BriefcaseBusiness, Building2, ChevronRight,
  ClipboardList, ExternalLink, FileSpreadsheet, LayoutDashboard,
  MapPinned, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck,
  UsersRound, UserCog, X,
} from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { StaffModule } from "@/lib/staff-modules";

const navSections = [
  { title: "OPERATIONS", items: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Citizen reports", href: "/admin/reports", icon: ClipboardList },
    { label: "Online LGU services", href: "/admin/services", icon: Building2 },
    { label: "Registered citizens", href: "/admin/citizens", icon: UsersRound },
  ] },
  { title: "JOB MATCHING & EMPLOYMENT", items: [
    { label: "Overview & opportunities", href: "/admin/jobs", icon: BriefcaseBusiness },
    { label: "Employment insights", href: "/admin/jobs/insights", icon: BarChart3 },
    { label: "Employment data", href: "/admin/jobs/data", icon: FileSpreadsheet },
  ] },
  { title: "OTHER SERVICE MODULES", items: [
    { label: "Community census", href: "/admin/census", icon: BarChart3 },
    { label: "Emergency & alerts", href: "/admin/emergency", icon: BellRing },
    { label: "Municipal projects", href: "/admin/projects", icon: MapPinned },
  ] },
  { title: "TEAM MANAGEMENT", items: [
    { label: "LGU staff", href: "/admin/staff", icon: UserCog },
  ] },
] as const;

const modulesByPath: Record<string, StaffModule> = {
  "/admin/reports": "REPORTS",
  "/admin/services": "SERVICES",
  "/admin/emergency": "EMERGENCY",
  "/admin/projects": "PROJECTS",
  "/admin/jobs": "JOBS",
  "/admin/jobs/insights": "JOBS",
  "/admin/jobs/data": "COMMUNITY_DATA",
  "/admin/census": "CENSUS",
};

const pageMeta: Record<string, {title: string; subtitle: string}> = {
  "/admin": { title: "Overview", subtitle: "Operations dashboard" },
  "/admin/citizens": { title: "Registered citizens", subtitle: "Citizen account directory" },
  "/admin/staff": { title: "LGU staff", subtitle: "Team and module permissions" },
  "/admin/reports": { title: "Citizen reports", subtitle: "Civic reporting · LGU action desk" },
  "/admin/services": { title: "Online LGU services", subtitle: "Requests, assignments, schedules and verification" },
  "/admin/emergency": { title: "Emergency & alerts", subtitle: "Public safety workspace" },
  "/admin/projects": { title: "Municipal projects", subtitle: "Programs and public services" },
  "/admin/jobs": { title: "Job Matching", subtitle: "Employment, livelihood and opportunity workspace" },
  "/admin/jobs/insights": { title: "Employment insights", subtitle: "Skills, training, barriers and livelihood analytics" },
  "/admin/jobs/data": { title: "Employment data", subtitle: "Historical activity datasets, imports and manual encoding" },
  "/admin/census": { title: "Community census", subtitle: "Planned census module" },
  "/admin/profile": { title: "My profile", subtitle: "LGU account" },
};

const allNavItems = navSections.flatMap(section => section.items);

export function AdminShell({ children, name, email, role, modules, department }: { children: ReactNode; name: string; email: string; role: string; modules: StaffModule[]; department: string }) {
  const pathname = usePathname();
  const superAdmin = role === "ADMIN";
  const canSee = (href: string) => superAdmin || (href !== "/admin/citizens" && href !== "/admin/staff" && (!modulesByPath[href] || modules.includes(modulesByPath[href])));
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const matched = Object.keys(pageMeta)
    .filter(href => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? "/admin";
  const meta = pageMeta[matched];
  const initials = name.trim().split(/\s+/).slice(0,2).map(piece => piece[0]?.toUpperCase() ?? "").join("") || "LG";
  const activeHref = useMemo(() => allNavItems
    .map(item => item.href)
    .filter(href => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)))
    .sort((a,b) => b.length - a.length)[0] ?? "/admin", [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setMenuOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() { setMenuOpen(false); }

  return <div className={`elb-admin ${compact ? "elb-admin--compact" : ""}`}>
    <a href="#admin-content" className="elb-admin-skip">Skip to main content</a>
    {menuOpen && <button type="button" className="elb-admin-backdrop" onClick={closeMenu} aria-label="Close navigation overlay" />}

    <aside className={`elb-admin-sidebar ${menuOpen ? "elb-admin-sidebar--open" : ""}`} aria-label="LGU administration navigation">
      <div className="elb-admin-brand">
        <Link href="/admin" onClick={closeMenu} aria-label="eLingkod Bayan — Admin overview" className="elb-admin-brand-link">
          <Image src="/images/elb-mark.svg" alt="" width={40} height={46} priority className="elb-admin-brand-symbol" />
          <span className="elb-admin-brand-copy">
            <strong>eLingkod Bayan</strong>
            <small>LGU OPERATIONS PORTAL</small>
          </span>
        </Link>
        <button type="button" className="elb-admin-mobile-close" onClick={closeMenu} aria-label="Close navigation"><X size={20}/></button>
      </div>

      <div className="elb-admin-context" aria-label="Environment">
        <span className="elb-admin-context-dot" />
        <span className="elb-admin-context-copy">{superAdmin ? "Super Admin · All modules" : (department || "LGU staff workspace")}</span>
        <span className="elb-admin-context-short" title="Hackathon prototype">●</span>
      </div>

      <div className="elb-admin-nav-scroll">
        {navSections.filter(section => section.items.some(item => canSee(item.href))).map(section => <div className="elb-admin-section" key={section.title}>
          <div className="elb-admin-section-label">{section.title}</div>
          <nav aria-label={section.title} className="elb-admin-navigation">
            {section.items.filter(item => canSee(item.href)).map(item => {
              const Icon = item.icon;
              const active = activeHref === item.href;
              return <Link key={item.href} href={item.href} onClick={closeMenu} aria-current={active ? "page" : undefined} title={item.label} className={`elb-admin-nav-link ${active ? "elb-admin-nav-link--active" : ""}`}>
                <Icon size={19} strokeWidth={active ? 2.3 : 1.85} aria-hidden="true" />
                <span className="elb-admin-nav-label">{item.label}</span>
                {active && <span className="elb-admin-nav-active-mark" aria-hidden="true" />}
              </Link>;
            })}
          </nav>
        </div>)}
      </div>

      <div className="elb-admin-sidebar-bottom">
        <Link href="/" className="elb-admin-external" onClick={closeMenu} title="Browse the public website. Citizen-only actions require a Citizen account."><ExternalLink size={17}/><span>Public website</span><ChevronRight size={14} className="elb-admin-external-arrow"/></Link>
        <Link href="/admin/profile" title="Administrator profile" onClick={closeMenu} className="elb-admin-user">
          <span className="elb-admin-avatar">{initials}</span>
          <span className="elb-admin-user-info"><strong>{name}</strong><small>{superAdmin ? "Super Admin" : "LGU Staff"} · {email}</small></span>
          <ChevronRight size={14} className="elb-admin-user-arrow" />
        </Link>
        <div className="elb-admin-logout"><LogoutButton fullWidth /></div>
        <button type="button" className="elb-admin-collapse" onClick={() => setCompact(value => !value)} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!compact} title={compact ? "Expand sidebar" : "Collapse sidebar"}>
          {compact ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}<span>{compact ? "Expand" : "Collapse sidebar"}</span>
        </button>
      </div>
    </aside>

    <div className="elb-admin-main-column">
      <header className="elb-admin-topbar">
        <div className="elb-admin-topbar-start">
          <button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="elb-admin-menu-toggle"><Menu size={21}/></button>
          <div className="elb-admin-heading-group">
            <div className="elb-admin-breadcrumb"><span>LGU WORKSPACE</span><ChevronRight size={12}/><span className="elb-admin-breadcrumb-current">{meta.title}</span></div>
            <strong className="elb-admin-page-title">{meta.title}</strong>
          </div>
        </div>
        <div className="elb-admin-topbar-end">
          <span className="elb-admin-environment"><ShieldCheck size={15}/> Protected workspace</span>
          <Link href="/admin/profile" className="elb-admin-topbar-profile" aria-label={`View profile for ${name}`} title="Administrator profile"><span className="elb-admin-topbar-avatar">{initials}</span><span className="elb-admin-topbar-name">{name}</span><ChevronRight size={15}/></Link>
        </div>
      </header>
      <main id="admin-content" className="elb-admin-content" tabIndex={-1}>
        <div className="elb-admin-content-inner">{children}</div>
      </main>
      <footer className="elb-admin-footer"><span>eLingkod Bayan · Community service workspace</span><span>Hackathon prototype — not an official LGU website</span></footer>
    </div>
  </div>;
}
