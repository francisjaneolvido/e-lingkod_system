import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BriefcaseBusiness, LockKeyhole, SearchCheck, Sparkles } from "lucide-react";
import { currentViewer } from "@/lib/access";
import { publishedJobs, profileForCitizen, rankJobs } from "@/features/jobs/server/data";
import { communityMatchProfile } from "@/features/community/server/data";
import { OpportunitiesBrowser } from "@/features/jobs/components/opportunities-browser";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const instant = false;
export const metadata: Metadata = { title: "Local Job Opportunities | eLingkod Bayan" };

export default async function OpportunitiesPage() {
  await connection();
  const viewer = await currentViewer();
  const citizen = viewer?.role === "CITIZEN";
  const jobsPromise = publishedJobs();
  const profilePromise = citizen
    ? communityMatchProfile(viewer.id).then(profile => profile ?? profileForCitizen(viewer.id))
    : Promise.resolve(null);
  const [jobs, profile] = await Promise.all([jobsPromise, profilePromise]);
  const ranked = rankJobs(jobs, profile);

  return (
    <>
      <SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role } : null} />
      <main className="min-h-screen bg-[#f5f9fc] pb-14">
        <section className="border-b border-[#dceaf2] bg-[linear-gradient(115deg,#e7f4fa,#f8fcff_60%,#fff)] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
          <div className="mx-auto max-w-[1240px]">
            <div className="max-w-[850px]">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.13em] text-[#227a9d]"><BriefcaseBusiness size={16} /> eLingkod Bayan / Opportunity Recommendations</p>
              <h1 className="mt-4 text-[clamp(2rem,3.5vw,3.3rem)] font-extrabold leading-[1.12] tracking-tight text-[#143e63]">Explore local opportunities that may fit your goals.</h1>
              <p className="mt-4 max-w-[730px] text-sm leading-7 text-[#55788d] sm:text-base">Browse PESO-reviewed local vacancies, compare qualifications, and see relevant suggestions based on community-survey skills and preferences you choose to use privately. This is not an application or eligibility decision.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {citizen ? (
                  <Link href="/community-survey" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155778] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b7197] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155778]"><Sparkles size={17} />{profile ? "Update community profile" : "Complete community survey"}</Link>
                ) : (
                  <Link href="/login?next=%2Fcommunity-survey" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155778] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b7197]">Sign in for suggestions</Link>
                )}
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#cedfe9] bg-white px-4 py-3 text-xs font-bold text-[#436d83]"><LockKeyhole size={15} /> Recommendations optional & private</span>
              </div>
            </div>
            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#d7e8ef] bg-white/85 p-4"><p className="text-2xl font-extrabold text-[#16496a]">{jobs.length}</p><p className="mt-1 text-xs font-semibold text-[#5c7d90]">Available listings</p></div>
              <div className="rounded-2xl border border-[#d7e8ef] bg-white/85 p-4"><SearchCheck size={22} className="text-[#1e7f93]"/><p className="mt-2 text-xs font-semibold text-[#5c7d90]">PESO-managed postings</p></div>
              <div className="rounded-2xl border border-[#d7e8ef] bg-white/85 p-4"><Sparkles size={22} className="text-[#1e7f93]"/><p className="mt-2 text-xs font-semibold text-[#5c7d90]">Skills-based suggestions</p></div>
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-[1240px] px-5 pt-8 sm:px-8 lg:px-12">
          {citizen && !profile && <div className="mb-5 rounded-2xl border border-[#d3e5ed] bg-white p-4 text-sm leading-6 text-[#487189]">Want personalized suggestions? <Link href="/community-survey" className="font-extrabold text-[#166788] underline underline-offset-2">Complete the community survey</Link>. You can still browse every published opportunity without one.</div>}
          {profile && <p className="mb-5 flex items-start gap-2 rounded-2xl border border-[#cde7db] bg-[#eff9f3] p-4 text-sm font-semibold leading-6 text-[#276955]"><Sparkles size={17} className="mt-0.5 shrink-0" /> Suggestions are ordered by skills, interests and preferences. Match indicators are not proof of eligibility or guarantees of employment.</p>}
          <OpportunitiesBrowser jobs={ranked} personalized={Boolean(profile)} />
          <p className="mt-7 text-xs leading-6 text-[#658598]">This is an informational job discovery service, not an online application system. Always confirm availability, qualifications, deadlines and application instructions directly with the employer or PESO. Your profile is not sent to employers.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
