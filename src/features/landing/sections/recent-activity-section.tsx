import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

/**
 * Deliberate empty-state UI: don't invent counts or records before
 * report/application tables are created and connected to this page.
 */
export function RecentActivitySection() {
  return (
    <section aria-labelledby="recent-activity-heading" className="bg-white px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-[1344px]">
        <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#1b78a9]">Your account activity</p>
        <h2 id="recent-activity-heading" className="mt-2 text-[clamp(1.55rem,3vw,2.2rem)] font-extrabold tracking-[-.04em] text-[#153b63]">My Recent Activity</h2>
        <div className="mt-5 flex flex-col items-start gap-5 rounded-[22px] border border-dashed border-[#c7dce9] bg-[#f7fbfe] p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#EDF5FB] text-[#153B63]"><Clock3 size={28} strokeWidth={1.8}/></span>
          <div className="flex-1">
            <h3 className="text-[15px] font-extrabold text-[#183f63]">Activity tracking is coming soon</h3>
            <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[#607e94]">
              When Civic Reporting and online applications are enabled, submitted requests and their verified status updates will appear here. No sample submissions are displayed as real records.
            </p>
          </div>
          <Link href="/#services" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#bcd7e9] bg-white px-5 py-3 text-[12px] font-bold text-[#153b63] transition hover:bg-[#edf6fc]">
            See services <ArrowRight size={16}/>
          </Link>
        </div>
      </div>
    </section>
  );
}
