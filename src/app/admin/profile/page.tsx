import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleUserRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { requirePageViewer } from "@/lib/access";
// Authenticated LGU pages read per-request session and database data.
export const instant = false;

export const metadata: Metadata = { title: "Admin Profile | E-Lingkod Bayan" };
export default async function AdminProfile() {
  const viewer = await requirePageViewer("/admin/profile");
  if (viewer.role !== "ADMIN" && viewer.role !== "STAFF") return null;
  return <div className="max-w-2xl"><Link href="/admin" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#277aaa]"><ArrowLeft size={15}/> Back to dashboard</Link><section className="mt-5 rounded-2xl border border-[#e0e9f1] bg-white p-7 sm:p-9"><CircleUserRound size={36} className="text-[#205e84]"/><h1 className="mt-4 text-2xl font-extrabold">LGU Account Profile</h1><p className="mt-2 text-[12px] text-[#8096a8]">Authenticated LGU account details</p><dl className="mt-6 space-y-3">{[{label:"Full name",value:viewer.name,icon:UserRound},{label:"Email address",value:viewer.email,icon:Mail},{label:"Access role",value:viewer.role === "ADMIN" ? "Super Admin" : "LGU Staff",icon:ShieldCheck},
{label:"Assigned office",value:viewer.department || "Not assigned",icon:ShieldCheck},
{label:"Designation",value:viewer.designation || "Not assigned",icon:ShieldCheck}].map(item=><div key={item.label} className="flex items-start gap-3 rounded-xl bg-[#f4f8fb] p-4"><item.icon size={19} className="mt-1 text-[#296989]"/><div><dt className="text-[11px] font-bold text-[#7890a4]">{item.label}</dt><dd className="mt-1 break-words text-[13px] font-bold">{item.value}</dd></div></div>)}</dl><p className="mt-6 flex items-start gap-2 text-[11px] leading-6 text-[#7e91a5]"><LockKeyhole size={15} className="mt-1 shrink-0"/> Account editing and password reset are not implemented yet. Keep admin credentials private.</p></section></div>;
}
