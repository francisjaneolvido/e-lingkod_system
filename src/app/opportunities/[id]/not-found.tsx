import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";

export default function OpportunityNotFound() {
  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-[#f5f9fc] px-5 py-12">
      <div className="w-full max-w-lg rounded-[24px] border border-[#d8e8f0] bg-white p-8 text-center shadow-[0_10px_32px_rgba(17,63,97,.04)] sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf5fa] text-[#286b8a]"><BriefcaseBusiness size={26}/></span>
        <h1 className="mt-5 text-2xl font-extrabold text-[#17476c]">This opportunity is no longer available</h1>
        <p className="mt-3 text-sm leading-7 text-[#587b90]">The listing may have expired, been filled or withdrawn. Browse other published local opportunities instead.</p>
        <Link href="/opportunities" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155778] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0c6d93]"><ArrowLeft size={16}/> View available opportunities</Link>
      </div>
    </main>
  );
}
