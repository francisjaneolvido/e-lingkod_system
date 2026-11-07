import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const instant = false;
export const metadata: Metadata = { title: "Community Census | eLingkod Bayan" };
export default async function CommunityCensusPage() {
  await connection();
  const viewer = await currentViewer();
  return <><SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role, identityStatus: viewer.identityStatus } : null} /><main className="public-page">
    <header className="public-page-masthead"><div className="public-container"><div><p className="public-context"><BarChart3 size={18} aria-hidden="true" /> Community Census</p><h1>Protected records.<br />Responsible local planning.</h1><p>Worker Census &amp; Social Profiling includes individual and establishment survey records for authorized LGU personnel. Public census statistics are not currently published.</p></div><div className="public-actions"><Link href="/community-employment" className="elb-button elb-button-primary">About Citizen Profiling <ArrowRight size={17} aria-hidden="true" /></Link></div></div></header>
    <div className="public-container"><section className="public-editorial" aria-labelledby="census-access"><div><h2 id="census-access">What you can access here</h2><p>This page explains census access. No individual records or census statistics are displayed.</p></div><div className="public-editorial-list"><div><h3>Participate in profiling</h3><p>Visit Citizen Profiling for individual and establishment survey entry points and participation information.</p><Link href="/community-employment" className="inline-flex min-h-11 items-center gap-2 font-semibold underline">Open Citizen Profiling <ArrowRight size={16} aria-hidden="true" /></Link></div><div><h3>Explore opportunities</h3><p>Browse reviewed opportunity references. Suggestions are informational and do not submit a job application.</p><Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 font-semibold underline">Browse opportunities <ArrowRight size={16} aria-hidden="true" /></Link></div><div><h3 className="flex items-center gap-2"><ShieldCheck size={20} aria-hidden="true" /> Authorized LGU access</h3><p>Protected records and analytics require the appropriate LGU role and permissions. Public and citizen analytics remain unavailable.</p></div></div></section></div>
  </main><SiteFooter /></>;
}
