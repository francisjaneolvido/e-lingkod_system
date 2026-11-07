import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { CircleUserRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { requirePageViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const instant = false;
export const metadata: Metadata = { title: "My Profile | E-Lingkod Bayan" };

export default async function ProfilePage() {
  await connection();
  const viewer = await requirePageViewer("/account/profile");
  if (viewer.role === "ADMIN" || viewer.role === "STAFF") redirect("/admin/profile");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader viewer={viewer} />
      <main className="elb-account-main elb-account-wide">
        <Link href="/account" className="elb-account-back">← Back to my account</Link>
        <header className="elb-account-title mt-6"><div><h1>My profile</h1><p>Your registered name and email address.</p></div></header>
        <section className="elb-account-section elb-workflow-panel" aria-label="Registered account details">
          <div className="flex items-center gap-3"><CircleUserRound aria-hidden="true" size={28}/><h2>{viewer.name}</h2></div>
          <dl className="elb-account-facts">
            <div><UserRound aria-hidden="true" size={20}/><div><dt>Full name</dt><dd>{viewer.name}</dd></div></div>
            <div><Mail aria-hidden="true" size={20}/><div className="min-w-0"><dt>Email address</dt><dd>{viewer.email}</dd></div></div>
          </dl>
          <p className="elb-account-note"><LockKeyhole aria-hidden="true" size={18}/>Profile editing and password management are not available on this page. Never share your password.</p>
          <Link href="/verification" className="elb-button mt-6">View verification status</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
