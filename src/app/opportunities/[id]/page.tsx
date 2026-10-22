import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, BookOpenCheck, BriefcaseBusiness,
  CalendarDays, CheckCircle2, CircleHelp, Clock3, Info,
  LockKeyhole, MapPin, Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { currentViewer } from "@/lib/access";
import { publishedJobById, profileForCitizen } from "@/features/jobs/server/data";
import { communityMatchProfile } from "@/features/community/server/data";
import { EDUCATION_LABEL, WORK_LABEL, scoreMatch } from "@/features/jobs/domain";

export const instant = false;
export const metadata: Metadata = { title: "Job Details | eLingkod Bayan" };

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const viewer = await currentViewer();
  const citizen = viewer?.role === "CITIZEN";
  const job = await publishedJobById(id);
  if (!job) notFound();
  const profile = citizen ? (await communityMatchProfile(viewer.id)) ?? (await profileForCitizen(viewer.id)) : null;
  const match = profile ? scoreMatch(profile, job) : null;
  const safeExternalUrl = job.externalUrl && /^https?:\/\/[^\s]+$/i.test(job.externalUrl) ? job.externalUrl : null;

  return (
    <>
      <SiteHeader viewer={viewer ? { name: viewer.name, email: viewer.email, role: viewer.role } : null} />
      <main className="min-h-screen bg-[#f5f9fc] pb-14">
        <div className="mx-auto max-w-[1190px] px-5 py-8 sm:px-8 sm:py-11 lg:px-12">
          <Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#1c698e] hover:text-[#154969] focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowLeft size={17} /> Back to job opportunities</Link>
          <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-[24px] border border-[#dce9f1] bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf7f0] px-3 py-1.5 text-xs font-bold text-[#28775b]"><CheckCircle2 size={14} /> Published opportunity</span>
                  <span className="rounded-full bg-[#eef5fa] px-3 py-1.5 text-xs font-bold text-[#276787]">{job.sector}</span>
                </div>
                <h1 className="mt-5 text-[clamp(1.85rem,3vw,2.65rem)] font-extrabold leading-[1.12] tracking-tight text-[#163f65]">{job.title}</h1>
                <p className="mt-3 text-base font-semibold text-[#47738b]">{job.employer}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e0eaf0] bg-[#f6fafc] px-3 py-2.5 text-sm font-medium text-[#476d83]"><Clock3 size={17} /> {WORK_LABEL[job.workType] || job.workType}</span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#e0eaf0] bg-[#f6fafc] px-3 py-2.5 text-sm font-medium text-[#476d83]"><MapPin size={17} /> {job.location} · {job.barangay}</span>
                  {job.expiresAt && <span className="inline-flex items-center gap-2 rounded-xl border border-[#e0eaf0] bg-[#f6fafc] px-3 py-2.5 text-sm font-medium text-[#476d83]"><CalendarDays size={17} /> Listed deadline: {new Date(job.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</span>}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#dce9f1] bg-white p-6 sm:p-8">
                <h2 className="text-xl font-extrabold text-[#174566]">About this opportunity</h2>
                <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-[#536f82]">{job.description}</p>
                <div className="my-6 border-t border-[#e7edf2]" />
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#174566]"><BookOpenCheck size={19} /> Qualifications & listed skills</h2>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#64849a]">Skills mentioned in this listing</p>
                <div className="mt-2 flex flex-wrap gap-2">{job.skills.map(skill => <span key={skill} className="rounded-xl border border-[#d6e6ef] bg-[#f2f8fb] px-3 py-2 text-sm font-semibold text-[#3e6b86]">{skill}</span>)}</div>
                <div className="mt-5 rounded-xl border border-[#e4ecf1] bg-[#f7fafc] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#648398]">Education indicated</p><p className="mt-1 text-sm font-semibold text-[#1d5071]">{EDUCATION_LABEL[job.education] || job.education}</p><p className="mt-2 text-xs leading-5 text-[#668597]">This field is informational. Other eligibility criteria may apply; check directly with the employer.</p></div>
              </section>

              <section className="rounded-[24px] border border-[#dce9f1] bg-white p-6 sm:p-8">
                <h2 className="text-xl font-extrabold text-[#174566]">How to inquire or apply</h2>
                <p className="mt-3 text-sm leading-6 text-[#5a788d]">Follow the official instructions supplied by the employer or PESO.</p>
                <div className="mt-4 rounded-xl bg-[#edf6fa] p-4"><p className="whitespace-pre-line break-words text-sm font-semibold leading-7 text-[#275775]">{job.contactInfo}</p></div>
                {safeExternalUrl && <a href={safeExternalUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155778] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b7197] focus-visible:outline-2 focus-visible:outline-offset-2">Visit external employer posting <ArrowUpRight size={17} /></a>}
                <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-[#71899a]"><Info size={16} className="mt-0.5 shrink-0" /> eLingkod Bayan provides information, not an online job application or hiring decision. Confirm vacancy availability and requirements before sharing personal documents.</p>
              </section>
            </div>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-28" aria-label="Your opportunity recommendation guide">
              <section className="rounded-[24px] border border-[#d4e5ef] bg-white p-5 shadow-[0_8px_25px_rgba(15,64,101,.045)] sm:p-6">
                <div className="flex items-center gap-2"><Sparkles size={20} className="text-[#217b93]" /><h2 className="text-lg font-extrabold text-[#17496b]">Your skills match</h2></div>
                {match ? (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm leading-6 text-[#55788c]">An informational comparison with your saved profile—not a qualification assessment.</p>
                    <div><p className="text-xs font-extrabold uppercase tracking-wide text-[#487c85]">Skills also in your profile</p><p className="mt-2 text-sm leading-6 text-[#245f57]">{match.matchedSkills.length ? match.matchedSkills.join(", ") : "No shared listed skills yet"}</p></div>
                    <div className="border-t border-[#e6eef3] pt-3"><p className="text-xs font-extrabold uppercase tracking-wide text-[#678299]">Other skills to review</p><p className="mt-2 text-sm leading-6 text-[#56768d]">{match.missingSkills.length ? match.missingSkills.join(", ") : "All listed skills also appear in your profile"}</p></div>
                    {match.matchedInterests.length > 0 && <p className="border-t border-[#e6eef3] pt-3 text-sm leading-6 text-[#52778d]">Related interests: {match.matchedInterests.join(", ")}</p>}
                    <p className="rounded-lg bg-[#f1f7fa] px-3 py-3 text-xs leading-5 text-[#56798b]">Education, work experience and employer screening are not checked by this matching feature.</p>
                    <Link href="/community-survey" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#176c94] underline underline-offset-4">Update my community profile <ArrowUpRight size={16} /></Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm leading-6 text-[#59798e]">Complete the optional community survey to see which listed skills overlap with yours. You can browse opportunities without a profile.</p>
                    <Link href={citizen ? "/community-survey" : "/login?next=%2Fcommunity-survey"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155778] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#0b7197]"><CircleHelp size={17} /> {citizen ? "Complete community survey" : "Sign in for suggestions"}</Link>
                  </div>
                )}
              </section>
              <div className="flex items-start gap-3 rounded-xl border border-[#d3e8df] bg-[#edf8f2] p-4 text-xs leading-6 text-[#36745c]"><LockKeyhole size={18} className="mt-0.5 shrink-0" /><p>Your community survey profile is private and is not automatically forwarded to employers. Opportunity recommendations require your separate consent.</p></div>
              <Link href="/opportunities" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#285d7c]"><BriefcaseBusiness size={17} /> Browse more opportunities</Link>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
