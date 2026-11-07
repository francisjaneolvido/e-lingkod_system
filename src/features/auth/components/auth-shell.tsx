import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeControl } from "@/components/shared/theme-control";

export function AuthShell({ children, page }: { children: ReactNode; page: "login" | "register" }) {
  return <div className="elb-auth-page">
    <header className="elb-account-header"><BrandLogo /><div className="elb-account-utilities"><Link href="/" className="elb-account-back" aria-label="Back to home"><ArrowLeft size={17} aria-hidden="true" /><span>Back to home</span></Link><ThemeControl /></div></header>
    <main className={`elb-auth-layout ${page === "register" ? "elb-auth-registration" : ""}`}>
      <section className="elb-auth-form-panel">{children}<p className="elb-auth-security"><ShieldCheck size={17} aria-hidden="true" /> Protected account access</p></section>
      <aside className="elb-auth-intro" aria-label="Account guidance">
        <h2>Community services, together</h2>
        <p className="elb-auth-lead">Your place to raise a concern, follow its progress, and access community services.</p>
        <p className="elb-auth-guidance">New Citizen accounts submit an ID for an Admin decision before Citizen features become available.</p>
        <p className="elb-auth-public">Just looking around? <Link href="/">Browse public information</Link></p>
      </aside>
    </main>
    <footer className="elb-auth-footer">eLingkod Bayan · Report. Act. Resolve.</footer>
  </div>;
}
