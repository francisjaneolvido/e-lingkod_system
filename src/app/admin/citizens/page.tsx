import type { Metadata } from "next";
import Link from "next/link";
import { Search, UsersRound, LockKeyhole, ChevronLeft, ChevronRight, Mail, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/lib/access";

export const instant = false;
export const metadata: Metadata = { title: "Registered Citizens | eLingkod Bayan" };
const LIMIT = 20;

export default async function CitizensPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireSuperAdminPage("/admin/citizens");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const rawPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const where = { role: "CITIZEN", ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}) };
  const [citizens, total, allCitizens] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, _count: { select: { reports: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: LIMIT, skip: (page - 1) * LIMIT }),
    prisma.user.count({ where }), prisma.user.count({ where: { role: "CITIZEN" } }),
  ]);
  const pages = Math.ceil(total / LIMIT);
  const pageLink = (number: number) => `/admin/citizens?${new URLSearchParams({ ...(q ? { q } : {}), page: String(number) })}`;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><span className="elb-admin-eyebrow">COMMUNITY DIRECTORY</span><h1 className="mt-2 text-[25px] font-extrabold tracking-tight text-foreground">Registered citizens</h1><p className="mt-1 text-[12px] text-muted-foreground">Secure view of accounts registered on eLingkod Bayan.</p></div><div className="rounded-2xl border border-border bg-card px-5 py-3 text-right"><strong className="block text-2xl font-extrabold text-foreground">{allCitizens.toLocaleString()}</strong><span className="text-xs text-muted-foreground">Citizen accounts</span></div></header>
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-foreground"><LockKeyhole size={19} className="mt-0.5 shrink-0"/><p className="text-xs leading-6">Emails are personal information. This directory is visible to <strong>Super Admin only</strong>; do not publicly publish or export citizen contact details. For prototype use, prefer sample accounts and obtain appropriate consent before collecting real data.</p></div>
    <section className="overflow-hidden rounded-[18px] border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5"><form action="/admin/citizens" method="GET" className="flex w-full max-w-xl gap-2"><label className="relative flex-1"><span className="sr-only">Search by name or email</span><Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground"/><input type="search" name="q" defaultValue={q} maxLength={80} placeholder="Search name or email..." className="elb-admin-field pl-9" /></label><button className="elb-admin-primary" type="submit">Search</button></form><span className="text-xs font-semibold text-muted-foreground">{total} matching accounts</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-[12px]"><thead className="bg-card text-xs font-bold uppercase tracking-[.12em] text-muted-foreground"><tr><th className="p-4">Citizen</th><th className="p-4">Email</th><th className="p-4">Registered on</th><th className="p-4 text-center">Reports</th></tr></thead><tbody>{citizens.map(citizen => <tr key={citizen.id} className="border-t border-border"><td className="p-4"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted font-bold text-foreground">{citizen.name[0]?.toUpperCase() ?? "C"}</span><span className="font-bold text-foreground">{citizen.name}</span></div></td><td className="p-4"><div className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-muted-foreground"/><span className="break-all text-foreground">{citizen.email}</span></div></td><td className="p-4 text-muted-foreground">{citizen.createdAt.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })}</td><td className="p-4 text-center"><span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 font-bold text-foreground"><ClipboardList size={13}/>{citizen._count.reports}</span></td></tr>)}</tbody></table></div>
      {citizens.length === 0 && <div className="grid justify-items-center gap-2 px-5 py-14 text-center"><UsersRound className="text-muted-foreground" size={30}/><p className="text-sm font-bold text-foreground">No citizen accounts found</p><p className="text-xs text-muted-foreground">Try another name or email.</p></div>}
      <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4"><span className="text-xs text-muted-foreground">Page {page} of {Math.max(pages, 1)}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={page > 1 ? pageLink(page - 1) : pageLink(1)} className={`elb-admin-pager ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}><ChevronLeft size={15}/> Previous</Link><Link aria-disabled={page >= pages} href={page < pages ? pageLink(page + 1) : pageLink(Math.max(pages, 1))} className={`elb-admin-pager ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>Next <ChevronRight size={15}/></Link></div></div>
    </section>
    <p className="text-xs text-muted-foreground">Staff members are listed separately in <Link href="/admin/staff" className="font-semibold text-foreground underline-offset-2 hover:underline">LGU Staff Management</Link>. Your account remains in this system if staff access is later revoked.</p>
  </div>;
}
