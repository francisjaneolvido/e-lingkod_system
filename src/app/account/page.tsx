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
    <div className="min-h-screen bg-[#f5f9fc] text-[#153b63]">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#247aab]"><ShieldCheck size={16} /> {viewer.role === "ADMIN" || viewer.role === "STAFF" ? "LGU staff account" : "Signed-in citizen"}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">My Account</h1>
        <p className="mt-3 text-[13px] leading-7 text-[#628198]">Welcome, {viewer.name}. Manage your profile and explore your account modules.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/account/profile" className="group rounded-2xl border border-[#dae7ef] bg-white p-6 transition hover:border-[#8cbad4] hover:shadow-md">
            <CircleUserRound className="text-[#153b63]" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Profile</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#668398]">View your registered account details.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-[#2077a8]">Open profile <ArrowRight size={15} /></span>
          </Link>
          <Link href="/reports" className="rounded-2xl border border-[#dae7ef] bg-white p-6 transition hover:border-[#8cbad4] hover:shadow-md">
            <ClipboardList className="text-[#153b63]" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Reports</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#668398]">View your submitted concerns, photos, and progress updates.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-[#2077a8]">Open my reports <ArrowRight size={15} /></span>
          </Link>
          <div className="rounded-2xl border border-[#dae7ef] bg-white p-6">
            <Files className="text-[#153b63]" size={28} strokeWidth={1.8} />
            <h2 className="mt-4 font-extrabold">My Applications</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#668398]">Your service applications will appear after the application workflow is added.</p>
            <span className="mt-5 inline-block rounded-full bg-[#edf5fb] px-3 py-1 text-[10px] font-semibold text-[#58758b]">Coming soon</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
