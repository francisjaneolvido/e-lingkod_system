"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Bell, ChevronDown, CircleUserRound, ClipboardList,
  Files, Menu, ShieldCheck, UserRound, X,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { PortalViewer } from "@/features/landing/landing-page";
import { siteConfig } from "@/lib/site-config";

const citizenNavigation = [
  { label: "Home", href: "/#home" },
  { label: "Services", href: "/#services" },
  { label: "Tracking demo", href: "/#track-demo" },
  { label: "Community", href: "/#about" },
];

export function SiteHeader({ viewer }: { viewer: PortalViewer | null }) {
  const [open, setOpen] = useState(false);
  const profileDetails = useRef<HTMLDetailsElement>(null);
  const navigation = viewer ? citizenNavigation : siteConfig.nav;

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!profileDetails.current?.contains(event.target as Node)) {
        profileDetails.current?.removeAttribute("open");
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") profileDetails.current?.removeAttribute("open");
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
      <div className="border-b border-[#d5e5f1] bg-[#eef7ff]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-2 text-[10px] font-medium tracking-wide text-[#42617e] sm:px-8 lg:px-12">
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#166d9e]" aria-hidden /> A community-first digital service concept</span>
          <span className="hidden text-[#617f96] sm:block">Hackathon prototype · Not an official LGU website</span>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-[#e4eaf0] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[82px] lg:px-12">
          <BrandLogo />
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-8">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="text-[12px] font-semibold text-[#506b83] transition hover:text-[#0869a9] xl:text-[13px]">{item.label}</Link>)}
          </nav>
          {viewer ? (
            <div className="hidden items-center gap-3 lg:flex">
              <span className="flex size-10 cursor-not-allowed items-center justify-center rounded-full border border-[#e2ebf3] bg-[#f6f9fc] text-[#88a2b6]" aria-label="Notifications will be available in a future update" title="Notifications coming soon">
                <Bell size={18} strokeWidth={1.8} aria-hidden />
              </span>
              <details ref={profileDetails} className="group relative">
                <summary aria-label="Open account menu" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[#cbdfea] bg-white px-3.5 py-2 text-xs font-bold text-[#143e65] transition hover:bg-[#f1f8fd] [&::-webkit-details-marker]:hidden">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#EDF5FB] text-[#153B63]"><UserRound size={16} /></span>
                  <span className="max-w-[115px] truncate">{viewer.name.split(" ")[0] || "Citizen"}</span>
                  <ChevronDown size={15} className="transition group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[270px] overflow-hidden rounded-2xl border border-[#d9e6ef] bg-white p-2 shadow-[0_22px_55px_rgba(15,52,79,.17)]">
                  <div className="border-b border-[#e8eef3] px-3 py-3">
                    <p className="truncate text-[13px] font-extrabold text-[#153b63]">{viewer.name}</p>
                    <p className="mt-1 truncate text-[11px] text-[#7290a3]">{viewer.email}</p>
                  </div>
                  <Link href="/account" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#255172] hover:bg-[#eef6fb]"><CircleUserRound size={17} className="text-[#153B63]" /> My Account</Link>
                  <Link href="/account/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#255172] hover:bg-[#eef6fb]"><UserRound size={17} className="text-[#153B63]" /> My Profile</Link>
                  <div className="my-1 border-t border-[#e8eef3]" />
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-[#8aa0b0]" title="Coming in a future phase"><ClipboardList size={17} /> My Reports <span className="ml-auto text-[9px]">Soon</span></span>
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-[#8aa0b0]" title="Coming in a future phase"><Files size={17} /> My Applications <span className="ml-auto text-[9px]">Soon</span></span>
                  <div className="my-1 border-t border-[#e8eef3]" />
                  <LogoutButton fullWidth />
                </div>
              </details>
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/login" className="rounded-full border border-[#cddfea] px-5 py-2.5 text-xs font-bold text-[#14416b] transition hover:bg-[#edf7ff]">Log in</Link>
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#113c66] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#126caa]">Create an account <ArrowUpRight size={15}/></Link>
            </div>
          )}
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-controls="elb-mobile-menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dbe7ee] text-[#153a61] lg:hidden">
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
        {open && (
          <nav id="elb-mobile-menu" aria-label="Mobile" className="border-t border-[#e8edf2] bg-white px-5 py-4 shadow-xl sm:px-8 lg:hidden">
            <div className="mx-auto flex max-w-[580px] flex-col gap-1">
              {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-sm font-semibold text-[#234b72] hover:bg-[#f0f7fd]">{item.label}</Link>)}
              {viewer ? (
                <div className="mt-3 border-t border-[#e9f0f5] pt-3">
                  <p className="truncate px-4 py-2 text-[12px] font-bold text-[#153b63]">Signed in as {viewer.name}</p>
                  <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-[#234b72] hover:bg-[#f0f7fd]"><CircleUserRound size={17}/> My Account</Link>
                  <Link href="/account/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-[#234b72] hover:bg-[#f0f7fd]"><UserRound size={17}/> My Profile</Link>
                  <p className="px-4 py-2 text-[11px] text-[#8198aa]">Reports, applications and notifications: coming soon</p>
                  <div className="px-2 pt-2"><LogoutButton fullWidth /></div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-[#cddfea] py-3 text-center text-xs font-bold text-[#113c66]">Log in</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="rounded-xl bg-[#113c66] py-3 text-center text-xs font-bold text-white">Create account</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
