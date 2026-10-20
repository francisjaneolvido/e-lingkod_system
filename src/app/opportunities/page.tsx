import type {Metadata} from "next";
import Link from "next/link";
import {connection} from "next/server";
import {BriefcaseBusiness,ShieldCheck,Sparkles} from "lucide-react";
import {currentViewer} from "@/lib/access";
import {publishedJobs,profileForCitizen,rankJobs} from "@/features/jobs/server/data";
import {OpportunitiesBrowser} from "@/features/jobs/components/opportunities-browser";
import {SiteHeader} from "@/components/layout/site-header";
import {SiteFooter} from "@/components/layout/site-footer";
export const instant=false;
export const metadata:Metadata={title:"Local Job Opportunities | eLingkod Bayan"};
export default async function OpportunitiesPage(){
 await connection();
 const viewer=await currentViewer();const citizen=viewer?.role==="CITIZEN";
 const [jobs,profile]=await Promise.all([publishedJobs(),citizen?profileForCitizen(viewer.id):Promise.resolve(null)]);
 const ranked=rankJobs(jobs,profile);
 return <><SiteHeader viewer={viewer?{name:viewer.name,email:viewer.email,role:viewer.role}:null}/><main className="min-h-screen bg-[#f6fafc]"><section className="border-b border-[#e0edf3] bg-[linear-gradient(115deg,#e8f4fa,#fff_85%)] px-5 py-12 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1240px]"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#247d9f]"><BriefcaseBusiness size={16}/> eLingkod Bayan · PESO opportunities</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#153f62] sm:text-4xl">Discover local work opportunities</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#55798e]">Explore PESO-curated listings and find roles that connect with your interests and skills. No online job application or CV upload is required.</p><div className="mt-6 flex flex-wrap gap-3">{citizen?<Link href="/opportunities/profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155777] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#0b7197]"><Sparkles size={17}/>{profile?"Edit my matching profile":"Create optional skills profile"}</Link>:<Link href="/login?next=%2Fopportunities%2Fprofile" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155777] px-5 py-3 text-sm font-extrabold text-white">Sign in to save matching preferences</Link>}<span className="inline-flex items-center gap-2 rounded-xl border border-[#cee3ee] bg-white px-4 py-2 text-xs font-semibold text-[#49728a]"><ShieldCheck size={15}/> Verified publishing by authorized LGU personnel</span></div></div></section><div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:px-12">{citizen&&!profile&&<div className="mb-6 rounded-xl border border-[#d0e6ee] bg-white p-4 text-sm text-[#3e718c]">Want more relevant suggestions? <Link href="/opportunities/profile" className="font-bold underline">Create a private skills profile</Link> to personalize listing order. You can still browse everything without one.</div>}{profile&&<p className="mb-6 rounded-xl bg-[#e9f6f0] px-4 py-3 text-sm font-bold text-[#26755d]">Showing opportunity suggestions based on your saved skills and interests. Suggestions are not hiring decisions.</p>}<OpportunitiesBrowser jobs={ranked} personalized={Boolean(profile)}/><p className="mt-8 text-xs leading-6 text-[#758b99]">Listings may change. Verify vacancy details, eligibility and deadlines directly with the employer. Employers do not receive your profile via this platform.</p></div></main><SiteFooter/></>;
}
