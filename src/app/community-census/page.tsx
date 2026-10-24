import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { BarChart3, Construction, ShieldCheck } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const instant = false;
export const metadata: Metadata = { title: "Community Census | eLingkod Bayan" };

export default async function CommunityCensusPage() {
  await connection();
  const viewer = await currentViewer();
  return <>
    <SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role } : null} />
    <main className="min-h-[68vh] bg-[#f6f9fb] px-5 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[980px]">
        <section className="overflow-hidden rounded-[28px] border border-[#d8e6ed] bg-[linear-gradient(120deg,#eef8fc,#fff_65%,#f5faf7)] p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e7ee] bg-white px-3 py-1.5 text-xs font-extrabold text-[#357796]"><Construction size={15}/> Public statistics pending</span>
          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-[#e8f3f8] text-[#236f91]"><BarChart3 size={24}/></div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-[#143f61] sm:text-4xl">Community Census</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#627f91]">Worker Census &amp; Social Profiling includes protected individual and establishment survey records for authorized LGU personnel. Public census statistics are not published here. Employment and livelihood insights are available in the existing public insights workspace.</p>
              <p className="mt-3 flex max-w-2xl items-start gap-2 text-xs leading-6 text-[#7c94a2]"><ShieldCheck size={15} className="mt-1 shrink-0"/> No census records or census statistics are being displayed on this page.</p>
            </div>
            <Link href="/community-employment" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#165f7f] px-5 py-3 text-sm font-extrabold text-white">Open employment and livelihood insights</Link>
          </div>
        </section>
      </div>
    </main>
    <SiteFooter />
  </>;
}
