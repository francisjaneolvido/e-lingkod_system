import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import type { CivicViewer } from "../types";
import s from "../civic.module.css";

export function CivicShell({ viewer, active, children }: { viewer: CivicViewer | null; active: "new" | "reports" | "track" | "admin"; children: ReactNode }) {
  return <>
    <SiteHeader viewer={viewer} />
    <main className={s.page} id="civic-main"><div className={s.wrap}>
      <div className={s.subnav}>
        <div className={s.crumbs}><Link href="/">Home</Link><ChevronRight size={12} /><span>Civic reporting</span></div>
        <nav className={s.navlinks} aria-label="Civic reporting">
          <Link href="/reports/new" className={active === "new" ? s.activeNav : ""} aria-current={active === "new" ? "page" : undefined}>Report a concern</Link>
          <Link href="/reports" className={active === "reports" ? s.activeNav : ""} aria-current={active === "reports" ? "page" : undefined}>My reports</Link>
          <Link href="/track" className={active === "track" ? s.activeNav : ""} aria-current={active === "track" ? "page" : undefined}>Track a report</Link>
          {(viewer?.role === "ADMIN" || viewer?.role === "STAFF") && <Link href="/admin" className={active === "admin" ? s.activeNav : ""} aria-current={active === "admin" ? "page" : undefined}>Action desk</Link>}
        </nav>
      </div>
      {children}
    </div></main>
    <SiteFooter />
  </>;
}
