import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, FileText, ShieldCheck, UserRound } from "lucide-react";
import { requireModulePage } from "@/lib/access";
import { adminServiceRequest, serviceStaffOptions } from "@/features/services/server/data";
import { activeServiceRequirements, conditionMatches, serviceByKey, serviceForClient } from "@/features/services/catalog";
import { SERVICE_STATUS_META, isServiceStatus } from "@/features/services/domain";
import { AdminRequestActions } from "@/features/services/components/admin-request-actions";
import { DocumentReviewList } from "@/features/services/components/document-review-list";

export const instant = false;
export const metadata: Metadata = { title: "Service Request | Admin" };

export default async function AdminServiceDetail({ params }: { params: Promise<{id:string}> }) {
  const viewer = await requireModulePage("/admin/services", "SERVICES");
  const { id } = await params;
  const request = await adminServiceRequest(id, viewer);
  if (!request) notFound();
  const service = serviceByKey(request.serviceKey);
  if (!service) notFound();
  const staff = viewer.role === "ADMIN" ? await serviceStaffOptions(service.key) : [];
  const status = isServiceStatus(request.status) ? request.status : "DRAFT";

  const latestDocuments = new Map<string, any>();
  for (const document of request.documents) if (!latestDocuments.has(document.requirementKey)) latestDocuments.set(document.requirementKey, document);
  const requiredRequirements = activeServiceRequirements(service, request.formData || {}).filter(requirement => requirement.required);
  const verifiedRequiredCount = requiredRequirements.filter(requirement => latestDocuments.get(requirement.key)?.verificationStatus === "VERIFIED").length;
  const verificationReady = verifiedRequiredCount === requiredRequirements.length;
  const reviewEnabled = ["SUBMITTED", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(status);

  return <div className="space-y-4">
    <Link href="/admin/services" className="inline-flex items-center gap-2 text-xs font-bold text-[#2b7596]"><ArrowLeft size={15}/> Service Request Desk</Link>

    <section className="rounded-[20px] border border-[#d8e7ee] bg-white px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#2c7998]">{request.trackingId}</p><span className="text-[9px] text-[#9aabb4]">•</span><span className="text-[9px] font-bold text-[#6f8997]">{service.processingOffice}</span></div><h1 className="mt-1.5 text-xl font-black text-[#164361]">{request.serviceTitle}</h1><p className="mt-1 text-[11px] text-[#718b9a]">Citizen: <strong className="text-[#496b7e]">{request.requester.name}</strong> · Updated {new Date(request.updatedAt).toLocaleString("en-PH")}</p></div>
        <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${SERVICE_STATUS_META[status].tone}`}>{SERVICE_STATUS_META[status].label}</span>{request.assignedStaff && <span className="rounded-full bg-[#f1f5f7] px-3 py-1.5 text-[10px] font-bold text-[#607d8d]">{request.assignedStaff.name}</span>}</div>
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="space-y-4">
        <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserRound size={16} className="text-[#337a98]"/><h2 className="text-xs font-black text-[#214e69]">Citizen & request information</h2></div><span className="text-[9px] text-[#8297a4]">Account-backed citizen record</span></div>
          <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-3"><Data label="Citizen" value={request.requester.name}/><Data label="Email" value={request.requester.email}/><Data label="Phone" value={request.requester.phoneNumber || "Not provided"}/></div>
          <div className="mt-4 rounded-xl bg-[#f7fafb] p-3"><Data label={service.purposeLabel} value={request.purpose || "—"}/></div>
          <div className="mt-4 space-y-4">{Array.from(new Set(service.fields.filter(field => conditionMatches(field.condition, request.formData || {})).map(field => field.section))).map(section => <div key={section}><h3 className="mb-2 text-[9px] font-black uppercase tracking-[.1em] text-[#78909e]">{section}</h3><div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{service.fields.filter(field => field.section === section && conditionMatches(field.condition, request.formData || {})).map(field => <Data key={field.key} label={field.label} value={String(request.formData?.[field.key] || "—")}/>)}</div></div>)}</div>
        </section>

        <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={16} className="text-[#337a98]"/><h2 className="text-xs font-black text-[#214e69]">Requirements verification</h2></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${verificationReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{verifiedRequiredCount}/{requiredRequirements.length} required verified</span></div>
          <p className="mt-1.5 text-[10px] leading-4 text-[#8095a2]">Verify each required upload individually. Use “Replace” with a specific reason when the file is unreadable, inconsistent or insufficient.</p>
          <div className="mt-4"><DocumentReviewList requestId={request.id} requirements={activeServiceRequirements(service, request.formData || {})} documents={request.documents} reviewEnabled={reviewEnabled}/></div>
        </section>

        <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2"><ClipboardCheck size={16} className="text-[#337a98]"/><h2 className="text-xs font-black text-[#214e69]">Service review checklist</h2></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{service.reviewChecklist.map(item => <div key={item} className="flex gap-2 rounded-xl bg-[#f8fbfc] px-3 py-2.5 text-[10px] leading-4 text-[#607d8d]"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#53907d]"/>{item}</div>)}</div>
          <p className="mt-3 flex gap-2 rounded-xl bg-[#fff9ee] px-3 py-2.5 text-[10px] leading-4 text-[#84672f]"><ShieldCheck size={13} className="mt-0.5 shrink-0"/>This checklist supports review; it does not replace the office’s official Citizen’s Charter, technical assessment, fee assessment or legal eligibility decision.</p>
        </section>

        {request.appointments.length > 0 && <section className="rounded-[18px] border border-[#dedcf1] bg-[#fbfaff] p-4 sm:p-5">
          <div className="flex items-center gap-2"><CalendarClock size={16} className="text-[#68649c]"/><h2 className="text-xs font-black text-[#454073]">Appointment history</h2></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{request.appointments.map((appointment:any) => <div key={appointment.id} className="rounded-xl border border-[#e7e4f4] bg-white p-3"><div className="flex items-center justify-between gap-2"><strong className="text-[10px] text-[#504c7d]">{new Date(appointment.scheduledAt).toLocaleString("en-PH")}</strong><span className="rounded-full bg-[#f0eef9] px-2 py-0.5 text-[8px] font-bold text-[#6a6599]">{appointment.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-[10px] text-[#79759a]">{appointment.location}</p><p className="mt-1 text-[10px] leading-4 text-[#79759a]">{appointment.agenda}</p>{appointment.citizenNote && <p className="mt-2 rounded-lg bg-[#faf9ff] px-2.5 py-2 text-[9px] text-[#77739c]">Citizen note: {appointment.citizenNote}</p>}</div>)}</div>
        </section>}

        {(request.staffRecommendation || request.releaseNote || request.finalNote) && <section className="grid gap-3 sm:grid-cols-3">{request.staffRecommendation && <div className="rounded-[16px] border border-[#dce8ee] bg-white p-4"><span className="text-[9px] font-black uppercase tracking-wider text-[#78909e]">Staff recommendation</span><p className="mt-2 text-[11px] leading-5 text-[#45697d]">{request.staffRecommendation}</p></div>}{request.releaseNote && <div className="rounded-[16px] border border-[#e8dfce] bg-[#fffaf2] p-4"><span className="text-[9px] font-black uppercase tracking-wider text-[#8d7850]">Release / delivery note</span><p className="mt-2 text-[11px] leading-5 text-[#6f6249]">{request.releaseNote}</p></div>}{request.finalNote && <div className="rounded-[16px] border border-[#d9eadf] bg-[#f9fcfa] p-4"><span className="text-[9px] font-black uppercase tracking-wider text-[#668b7d]">Super Admin verification</span><p className="mt-2 text-[11px] leading-5 text-[#476b5e]">{request.finalNote}</p></div>}</section>}

        <section className="rounded-[18px] border border-[#dfe9ee] bg-white p-4 sm:p-5">
          <h2 className="text-xs font-black text-[#214e69]">Audit timeline</h2>
          <div className="mt-3 space-y-0">{request.events.map((event:any, index:number) => <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0"><span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-[#4d8ba5] ring-4 ring-[#edf6f9]"/>{index < request.events.length - 1 && <span className="absolute left-[4px] top-4 h-full w-px bg-[#d9e6ec]"/>}<div className="min-w-0"><p className="text-[10px] font-bold leading-4 text-[#315b72]">{event.note}</p><p className="mt-1 text-[9px] text-[#899ca8]">{event.actor?.name || "System"} · {new Date(event.createdAt).toLocaleString("en-PH")} · {event.visibleToCitizen ? "Citizen visible" : "Internal"}</p></div></div>)}</div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start"><AdminRequestActions request={request} service={serviceForClient(service)} viewerRole={viewer.role} staff={staff} verificationReady={verificationReady} verifiedRequiredCount={verifiedRequiredCount} requiredDocumentCount={requiredRequirements.length}/></aside>
    </div>
  </div>;
}

function Data({ label, value }: { label:string; value:string }) {
  return <div><span className="text-[9px] font-bold uppercase tracking-wider text-[#8a9ca7]">{label}</span><p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-5 text-[#45697d]">{value}</p></div>;
}
