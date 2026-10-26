"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BarChart3, Building2, BriefcaseBusiness, ChevronDown, CircleUserRound, ClipboardList,
  Files, GraduationCap, Menu, ShieldCheck, UserRound, UsersRound, X,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { PortalViewer } from "@/features/landing/landing-page";
import { services } from "@/features/landing/data/services";
import { NotificationBell } from "@/components/notifications/notification-bell";

// Services are drawn from the same six modules as the home page.
// Unreleased modules point to their existing service previews, never to broken app routes.
const serviceDestinations: Record<string, string> = {
  civic: "/reports/new",
  services: "/services",
  emergency: "/emergency",
  directory: "/#service-directory",
  jobs: "/community-employment",
  census: "/community-census",
};

const serviceDescriptions: Record<string, string> = {
  civic: "Submit a concern and track its progress",
  services: "Permits, clearances and IDs",
  emergency: "Hotlines and community alerts",
  directory: "LGU offices and municipal projects",
  jobs: "Employment survey, skills insights and verified opportunity discovery",
  census: "Community census module · planned",
};

const serviceNavigation = services.map((service) => ({
  ...service,
  href: serviceDestinations[service.id] ?? "/#services",
  live: service.id === "civic" || service.id === "services" || service.id === "jobs" || service.id === "emergency",
  description: serviceDescriptions[service.id] ?? service.description,
}));

const publicServiceNavigation = serviceNavigation.filter((service) => service.id !== "jobs" && service.id !== "census");

const communityNavigation = [
  { label: "Citizen Profiling overview", href: "/community-employment", description: "Employment, skills, training and livelihood profiling", icon: UsersRound },
  { label: "Citizen Profiling survey", href: "/community-survey", description: "Share skills, training interests and employment needs", icon: GraduationCap },
  { label: "Establishment Profiling", href: "/establishment-survey", description: "Manage your separate private organizational survey", icon: Building2 },
  { label: "Opportunities", href: "/opportunities", description: "Browse verified local opportunities", icon: BriefcaseBusiness },
] as const;

export function SiteHeader({ viewer }: { viewer: PortalViewer | null }) {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);
  const profileDetails = useRef<HTMLDetailsElement>(null);
  const servicesDetails = useRef<HTMLDivElement>(null);
  const servicesTrigger = useRef<HTMLButtonElement>(null);
  const communityDetails = useRef<HTMLDivElement>(null);
  const communityTrigger = useRef<HTMLButtonElement>(null);
  const staffPortal = viewer?.role === "ADMIN" || viewer?.role === "STAFF";
  const citizenPortal = viewer?.role === "CITIZEN";

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!profileDetails.current?.contains(event.target as Node)) {
        profileDetails.current?.removeAttribute("open");
      }
      if (!servicesDetails.current?.contains(event.target as Node)) setServicesOpen(false);
      if (!communityDetails.current?.contains(event.target as Node)) setCommunityOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        profileDetails.current?.removeAttribute("open");
        setServicesOpen(false);
        setMobileServicesOpen(false);
        setCommunityOpen(false);
        setMobileCommunityOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <>
      <div className="border-b border-border bg-muted">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-2 text-xs font-medium tracking-wide text-foreground sm:px-8 lg:px-12">
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-foreground" aria-hidden /> A community-first digital service concept</span>
          <span className="hidden text-muted-foreground sm:block">Hackathon prototype · Not an official LGU website</span>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[82px] lg:px-12">
          <BrandLogo />
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-8">
            <Link href="/#home" className="text-[12px] font-semibold text-muted-foreground transition hover:text-foreground xl:text-[13px]">Home</Link>
            <div
              ref={servicesDetails}
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setServicesOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setServicesOpen(false);
                  servicesTrigger.current?.focus();
                }
              }}
            >
              <button
                ref={servicesTrigger}
                type="button"
                aria-controls="elb-services-menu"
                aria-expanded={servicesOpen}
                onClick={() => setServicesOpen(true)}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border xl:text-[13px] ${servicesOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Services <ChevronDown aria-hidden size={15} className={`transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
              </button>
              {servicesOpen && (
                <div className="absolute left-1/2 top-full z-[80] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 pt-2">
                  <div id="elb-services-menu" className="rounded-[22px] border border-border bg-card p-4 shadow-[0_24px_65px_rgba(13,51,83,.17)] xl:p-5">
                    <div className="flex items-start justify-between gap-3 border-b border-border px-2 pb-3.5">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">eLingkod Bayan</p>
                        <p className="mt-1 text-[16px] font-extrabold text-foreground">Public services</p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-success">{publicServiceNavigation.filter((service) => service.live).length} available now</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {publicServiceNavigation.map((service) => {
                        const Icon = service.icon;
                        return (
                          <Link
                            key={service.id}
                            href={staffPortal && service.id === "civic" ? "/admin" : service.href}
                            onClick={() => setServicesOpen(false)}
                            className="group flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-border"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-card"><Icon size={19} aria-hidden /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-extrabold leading-5 text-foreground">{service.title}</span>
                              <span className="mt-0.5 block text-xs leading-[1.5] text-muted-foreground">{staffPortal && service.id === "civic" ? "Manage concerns in your LGU workspace" : service.description}</span>
                              <span className={`mt-1.5 inline-block text-xs font-bold ${service.live ? "text-success" : "text-muted-foreground"}`}>{service.live ? "Available" : "Preview"}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                    <Link href="/#services" onClick={() => setServicesOpen(false)} className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card text-[12px] font-bold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">
                      View all services <ArrowRight size={15} aria-hidden />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div
              ref={communityDetails}
              className="relative"
              onMouseEnter={() => setCommunityOpen(true)}
              onMouseLeave={() => setCommunityOpen(false)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCommunityOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setCommunityOpen(false);
                  communityTrigger.current?.focus();
                }
              }}
            >
              <button
                ref={communityTrigger}
                type="button"
                aria-controls="elb-community-menu"
                aria-expanded={communityOpen}
                onClick={() => setCommunityOpen((value) => !value)}
                className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[12px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border xl:text-[13px] ${communityOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Community <ChevronDown aria-hidden size={15} className={`transition-transform duration-200 ${communityOpen ? "rotate-180" : ""}`} />
              </button>
              {communityOpen && (
                <div className="absolute left-1/2 top-full z-[80] w-[min(390px,calc(100vw-2rem))] -translate-x-1/2 pt-2">
                  <div id="elb-community-menu" className="rounded-[22px] border border-border bg-card p-3 shadow-[0_24px_65px_rgba(13,51,83,.17)]">
                    <div className="px-3 pb-2 pt-1">
                      <p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">Community</p>
                      <p className="mt-1 text-[15px] font-extrabold text-foreground">Citizen Profiling & opportunities</p>
                    </div>
                    <div className="grid gap-1">
                      {(staffPortal
                        ? [{ label: "Workforce analytics", href: "/admin/census/analytics", description: "Protected census-scoped planning measures", icon: BarChart3 }, { label: "Opportunity management", href: "/admin/jobs", description: "Manage PESO-reviewed opportunities", icon: BriefcaseBusiness }, { label: "Protected census records", href: "/admin/census", description: "Authorized individual and establishment records", icon: BarChart3 }]
                        : communityNavigation
                      ).map((item) => {
                        const Icon = item.icon;
                        return <Link key={item.href} href={item.href} onClick={() => setCommunityOpen(false)} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-border">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"><Icon size={18} aria-hidden /></span>
                          <span><span className="block text-[12px] font-extrabold text-foreground">{item.label}</span><span className="mt-0.5 block text-[10.5px] leading-[1.45] text-muted-foreground">{item.description}</span></span>
                        </Link>;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link href="/#about" className="text-[12px] font-semibold text-muted-foreground transition hover:text-foreground xl:text-[13px]">About</Link>
          </nav>
          {viewer ? (
            <div className="hidden items-center gap-3 lg:flex">
              <NotificationBell />
              <details ref={profileDetails} className="group relative">
                <summary aria-label="Open account menu" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted [&::-webkit-details-marker]:hidden">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground"><UserRound size={16} /></span>
                  <span className="max-w-[115px] truncate">{viewer.name.split(" ")[0] || "Citizen"}</span>
                  <ChevronDown size={15} className="transition group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-[0_22px_55px_rgba(15,52,79,.17)]">
                  <div className="border-b border-border px-3 py-3">
                    <p className="truncate text-[13px] font-extrabold text-foreground">{viewer.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{viewer.email}</p>
                  </div>
                  <Link href={staffPortal ? "/admin" : "/account"} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><CircleUserRound size={17} className="text-foreground" /> My Account</Link>
                  <Link href={staffPortal ? "/admin/profile" : "/account/profile"} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><UserRound size={17} className="text-foreground" /> My Profile</Link>
                  <div className="my-1 border-t border-border" />
                  {citizenPortal && <Link href="/community-survey" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><GraduationCap size={17} /> Citizen Profiling</Link>}
                  {citizenPortal && <Link href="/establishment-survey" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><BarChart3 size={17} /> Establishment Profiling</Link>}
                  {citizenPortal && <Link href="/reports" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><ClipboardList size={17} /> My Reports</Link>}
                  {citizenPortal && <Link href="/services/requests" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><Files size={17} /> My LGU Requests</Link>}
                  {(viewer.role === "ADMIN" || viewer.role === "STAFF") && <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted"><ShieldCheck size={17} /> LGU workspace</Link>}
                  <div className="my-1 border-t border-border" />
                  <LogoutButton fullWidth />
                </div>
              </details>
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/login" className="rounded-full border border-border px-5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted">Log in</Link>
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold text-white transition hover:bg-primary">Create an account <ArrowUpRight size={15}/></Link>
            </div>
          )}
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-controls="elb-mobile-menu" aria-expanded={open} onClick={() => { setOpen((current) => !current); setMobileServicesOpen(false); setMobileCommunityOpen(false); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground lg:hidden">
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
        {open && (
          <nav id="elb-mobile-menu" aria-label="Mobile" className="max-h-[calc(100dvh-82px)] overflow-y-auto overscroll-contain border-t border-border bg-card px-5 py-4 shadow-xl sm:px-8 lg:hidden">
            <div className="mx-auto flex max-w-[580px] flex-col gap-1">
              <Link href="/#home" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted">Home</Link>
              <button
                type="button"
                aria-expanded={mobileServicesOpen}
                aria-controls="elb-mobile-services-menu"
                onClick={() => setMobileServicesOpen((current) => !current)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left text-sm font-extrabold text-foreground focus-visible:outline-2 focus-visible:outline-border"
              >
                Services <ChevronDown size={17} aria-hidden className={`transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileServicesOpen && (
                <div id="elb-mobile-services-menu" className="grid gap-1.5 border-l-2 border-border pl-3">
                  {publicServiceNavigation.map((service) => {
                    const Icon = service.icon;
                    return (
                      <Link
                        key={service.id}
                        href={staffPortal && service.id === "civic" ? "/admin" : service.href}
                        onClick={() => { setMobileServicesOpen(false); setOpen(false); }}
                        className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-border"
                      >
                        <Icon size={17} aria-hidden className="shrink-0 text-foreground" />
                        <span className="flex-1">{service.title}</span>
                        <span className={`text-xs font-semibold ${service.live ? "text-success" : "text-muted-foreground"}`}>{service.live ? "Live" : "Preview"}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                aria-expanded={mobileCommunityOpen}
                aria-controls="elb-mobile-community-menu"
                onClick={() => setMobileCommunityOpen((current) => !current)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left text-sm font-extrabold text-foreground focus-visible:outline-2 focus-visible:outline-border"
              >
                Community <ChevronDown size={17} aria-hidden className={`transition-transform ${mobileCommunityOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileCommunityOpen && (
                <div id="elb-mobile-community-menu" className="grid gap-1.5 border-l-2 border-border pl-3">
                  {(staffPortal
                    ? [{ label: "Workforce analytics", href: "/admin/census/analytics", description: "Protected census-scoped planning measures", icon: BarChart3 }, { label: "Opportunity management", href: "/admin/jobs", description: "Manage PESO-reviewed opportunities", icon: BriefcaseBusiness }, { label: "Protected census records", href: "/admin/census", description: "Authorized individual and establishment records", icon: BarChart3 }]
                    : communityNavigation
                  ).map((item) => {
                    const Icon = item.icon;
                    return <Link key={item.href} href={item.href} onClick={() => { setMobileCommunityOpen(false); setOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-foreground hover:bg-muted">
                      <Icon size={17} aria-hidden className="shrink-0 text-foreground"/><span>{item.label}</span>
                    </Link>;
                  })}
                </div>
              )}
              <Link href="/#about" onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted">About</Link>
              {viewer ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="truncate px-4 py-2 text-[12px] font-bold text-foreground">Signed in as {viewer.name}</p>
                  <Link href={staffPortal ? "/admin" : "/account"} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><CircleUserRound size={17}/> {staffPortal ? "LGU Dashboard" : "My Account"}</Link>
                  <Link href={staffPortal ? "/admin/profile" : "/account/profile"} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><UserRound size={17}/> My Profile</Link>
                  {citizenPortal && <Link href="/community-survey" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><GraduationCap size={17}/> Citizen Profiling</Link>}
                  {citizenPortal && <Link href="/establishment-survey" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><BarChart3 size={17}/> Establishment Profiling</Link>}
                  {citizenPortal && <Link href="/reports" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><ClipboardList size={17}/> My Reports</Link>}
                  {citizenPortal && <Link href="/services/requests" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><Files size={17}/> My LGU Requests</Link>}
                  {(viewer.role === "ADMIN" || viewer.role === "STAFF") && <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><ShieldCheck size={17}/> LGU workspace</Link>}
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground"><span>Notifications</span><NotificationBell /></div>
                  <div className="px-2 pt-2"><LogoutButton fullWidth /></div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-border py-3 text-center text-xs font-bold text-foreground">Log in</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="rounded-xl bg-primary py-3 text-center text-xs font-bold text-white">Create account</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
