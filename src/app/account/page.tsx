import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, CircleUserRound, ClipboardList, Files, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-card text-foreground">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.15em] text-muted-foreground"><ShieldCheck size={16} /> {viewer.role === "ADMIN" || viewer.role === "STAFF" ? "LGU staff account" : "Signed-in citizen"}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">My Account</h1>
        <p className="mt-3 text-[13px] leading-7 text-muted-foreground">Welcome, {viewer.name}. Manage your profile and explore your account modules.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/account/profile" className="group rounded-2xl border border-border bg-card p-6 transition hover:border-border hover:shadow-md">
            <CircleUserRound className="text-foreground" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Profile</h2>
            <p className="mt-2 text-[12px] leading-6 text-muted-foreground">View your registered account details.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-foreground">Open profile <ArrowRight size={15} /></span>
          </Link>
          <Link href="/reports" className="rounded-2xl border border-border bg-card p-6 transition hover:border-border hover:shadow-md">
            <ClipboardList className="text-foreground" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Reports</h2>
            <p className="mt-2 text-[12px] leading-6 text-muted-foreground">View your submitted concerns, photos, and progress updates.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-foreground">Open my reports <ArrowRight size={15} /></span>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-6">
            <Files className="text-foreground" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Applications</h2>
            <p className="mt-2 text-[12px] leading-6 text-muted-foreground">Your service applications will appear after the application workflow is added.</p>
            <span className="mt-5 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
