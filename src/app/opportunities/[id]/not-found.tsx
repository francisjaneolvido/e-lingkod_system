import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";

export default function OpportunityNotFound() {
  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-card px-5 py-12">
      <div className="w-full max-w-lg rounded-[24px] border border-border bg-card p-8 text-center shadow-[0_10px_32px_rgba(17,63,97,.04)] sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-foreground"><BriefcaseBusiness size={26}/></span>
        <h1 className="mt-5 text-2xl font-extrabold text-foreground">This opportunity is no longer available</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">The listing may have expired, been filled or withdrawn. Browse other published local opportunities instead.</p>
        <Link href="/opportunities" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary"><ArrowLeft size={16}/> View available opportunities</Link>
      </div>
    </main>
  );
}
