import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Building2, ShieldCheck, UsersRound } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const instant = false;
export const metadata: Metadata = { title: "Citizen Profiling | eLingkod Bayan" };
export default async function CommunityEmploymentPage() {
  await connection();
  const viewer = await currentViewer();
  const citizen = viewer?.role === "CITIZEN";
  return <><SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role, identityStatus: viewer.identityStatus } : null} /><main className="public-page">
    <header className="public-page-masthead"><div className="public-container"><div><p className="public-context"><UsersRound size={18} aria-hidden="true" /> Citizen Profiling</p><h1>Share your skills.<br />Help inform local planning.</h1><p>Employment, training and livelihood responses help authorized LGU staff understand participating residents’ needs. Choose the survey that applies to you.</p></div><div className="public-actions"><Link href="/opportunities" className="elb-button public-button-secondary">Browse opportunities <ArrowRight size={17} aria-hidden="true" /></Link></div></div></header>
    <div className="public-container"><section className="public-participation" aria-label="Choose a survey"><article><UsersRound size={28} aria-hidden="true" /><h2>Individual survey</h2><p>Share your employment situation, skills, training interests and livelihood needs.</p><Link href={citizen ? "/community-survey" : "/login?next=%2Fcommunity-survey"} className="elb-button elb-button-primary">{citizen ? "Complete individual survey" : "Sign in for individual survey"}<ArrowRight size={17} aria-hidden="true" /></Link></article><article><Building2 size={28} aria-hidden="true" /><h2>Establishment survey</h2><p>Provide your organization’s separate, private establishment profile.</p><Link href={citizen ? "/establishment-survey" : "/login?next=%2Festablishment-survey"} className="elb-button public-button-secondary">{citizen ? "Complete establishment survey" : "Sign in for establishment survey"}<ArrowRight size={17} aria-hidden="true" /></Link></article></section>
      <aside className="public-access-note"><h2 className="flex items-center gap-2"><ShieldCheck size={20} aria-hidden="true" /> Your participation and access</h2><p>Survey participation is not a job application. Workforce and social insights use participating records only. Census records and analytics are available to authorized LGU users; public and citizen statistics are not currently released.</p><Link href="/community-employment/insights" className="inline-flex min-h-11 items-center font-semibold underline">About analytics access</Link></aside>
      <section className="public-editorial" aria-labelledby="profiling-purpose"><div><h2 id="profiling-purpose">How responses can help</h2><p>The goal is to understand community needs and service access. It is not to rank residents or guarantee employment.</p></div><div className="public-editorial-list">{[["Training interests", "Understand which skills and training programs participating residents want to explore."], ["Barriers to participation", "Record recurring transport, cost, schedule and information challenges."], ["Programs and local planning", "Give authorized LGU staff structured information for proposals, research and program planning."]].map(([title, text]) => <div key={title}><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    </div>
  </main><SiteFooter /></>;
}
