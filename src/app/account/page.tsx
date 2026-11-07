import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, CircleUserRound, ClipboardList, Bell, ShieldCheck } from "lucide-react";
import { requirePageViewer } from "@/lib/access";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const instant = false;
export const metadata: Metadata = { title: "My Account | E-Lingkod Bayan" };

export default async function AccountPage() {
  await connection();
  const viewer = await requirePageViewer("/account");
  if (viewer.role === "ADMIN" || viewer.role === "STAFF") redirect("/admin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader viewer={viewer} />
      <main className="elb-account-main">
        <header className="elb-account-title"><div><h1>Welcome, {viewer.name}.</h1><p>Pick up your reports, check account activity, or review your registered details.</p></div><Link href="/reports/new" className="elb-button elb-button-primary">Report a concern <ArrowRight aria-hidden="true" size={17} /></Link></header>
        <div className="elb-account-grid">
          <section className="elb-account-section elb-workflow-panel"><h2>Continue a task</h2><div className="elb-account-links">
            <Link href="/reports" className="elb-account-link"><ClipboardList aria-hidden="true" size={24}/><div><strong>My reports</strong><p>Read updates, view evidence, and follow recorded action.</p></div><ArrowRight aria-hidden="true" size={18}/></Link>
            <Link href="/notifications" className="elb-account-link"><Bell aria-hidden="true" size={24}/><div><strong>Notifications</strong><p>Catch up on updates across your account.</p></div><ArrowRight aria-hidden="true" size={18}/></Link>
            <Link href="/account/profile" className="elb-account-link"><CircleUserRound aria-hidden="true" size={24}/><div><strong>My profile</strong><p>View your registered name and email address.</p></div><ArrowRight aria-hidden="true" size={18}/></Link>
          </div></section>
          <aside className="elb-account-feature"><ShieldCheck size={24} aria-hidden="true"/><h2>Identity review</h2><p>See your identity review status, any review decisions, and whether a new document is needed.</p><p className="elb-help">Identity review and each service’s eligibility checks are separate.</p><Link href="/verification" className="elb-button">View verification status <ArrowRight aria-hidden="true" size={17}/></Link></aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
