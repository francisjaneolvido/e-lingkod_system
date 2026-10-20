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
    <div className="min-h-screen bg-[#f5f9fc] text-[#153b63]">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto max-w-[760px] px-5 py-10 sm:px-8">
        <Link href="/account" className="text-[12px] font-bold text-[#2174a0] hover:underline">← Back to My Account</Link>
        <div className="mt-6 rounded-3xl border border-[#dce9f2] bg-white p-7 shadow-[0_16px_45px_rgba(20,70,100,.05)] sm:p-10">
          <CircleUserRound size={36} strokeWidth={1.6} className="text-[#153B63]" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-.04em]">My Profile</h1>
          <p className="mt-2 text-[12px] text-[#6c8799]">Read-only profile details from your authenticated account.</p>
          <dl className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-[#f3f8fc] p-4"><UserRound size={18} className="mt-1 shrink-0 text-[#153B63]" /><div><dt className="text-[11px] font-semibold text-[#62829b]">Full name</dt><dd className="mt-1 break-words text-[14px] font-bold">{viewer.name}</dd></div></div>
            <div className="flex items-start gap-3 rounded-xl bg-[#f3f8fc] p-4"><Mail size={18} className="mt-1 shrink-0 text-[#153B63]" /><div><dt className="text-[11px] font-semibold text-[#62829b]">Email address</dt><dd className="mt-1 break-all text-[14px] font-bold">{viewer.email}</dd></div></div>
          </dl>
          <p className="mt-6 flex items-start gap-2 text-[11px] leading-6 text-[#7790a2]"><LockKeyhole size={16} className="mt-1 shrink-0" /> Profile editing and password management will be added with the account settings feature. Never share your password.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
