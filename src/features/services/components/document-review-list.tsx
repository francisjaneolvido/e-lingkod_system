"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, RotateCcw, XCircle } from "lucide-react";
import type { ServiceRequirement } from "../catalog";

const statusTone: Record<string,string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

export function DocumentReviewList({ requestId, requirements, documents, reviewEnabled }: { requestId:string; requirements:ServiceRequirement[]; documents:any[]; reviewEnabled:boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const latest = new Map<string, any>();
  for (const document of documents) if (!latest.has(document.requirementKey)) latest.set(document.requirementKey, document);

  async function review(documentId:string, action:"VERIFY"|"REJECT") {
    setBusy(documentId + action);
    setError("");
    try {
      const response = await fetch(`/api/admin/services/requests/${requestId}/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[documentId] || "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to review document.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review document.");
    } finally {
      setBusy("");
    }
  }

  return <div className="space-y-2.5">
    {requirements.map(requirement => {
      const document = latest.get(requirement.key);
      const previousCount = documents.filter(item => item.requirementKey === requirement.key).length - (document ? 1 : 0);
      return <div key={requirement.key} className="rounded-xl border border-[#e1eaef] bg-[#fbfdfe] p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-[#315a72]">{requirement.label}</strong>{requirement.required && <span className="rounded-full bg-[#edf4f7] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#5f7d8d]">Required</span>}</div>
            {document ? <div className="mt-2 flex flex-wrap items-center gap-2">
              <a href={`/api/services/documents/${document.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#277594]"><FileText size={13}/><span>{document.fileName}</span><span className="rounded-md bg-[#edf5f8] px-1.5 py-0.5 text-[8px] uppercase tracking-wide">Preview / download</span></a>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${statusTone[document.verificationStatus] || statusTone.PENDING}`}>{document.verificationStatus === "REJECTED" ? "Needs replacement" : document.verificationStatus}</span>
              {previousCount > 0 && <span className="text-[9px] text-[#8aa0ad]">+{previousCount} earlier upload{previousCount === 1 ? "" : "s"}</span>}
            </div> : <p className={`mt-2 text-[11px] ${requirement.required ? "font-bold text-[#aa5d63]" : "text-[#8a9da8]"}`}>{requirement.required ? "Required document not uploaded" : "Optional document not uploaded"}</p>}
            {document?.verificationNote && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[10px] leading-4 text-[#667f8e]">Reviewer note: {document.verificationNote}</p>}
          </div>
        </div>
        {document && reviewEnabled && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={notes[document.id] || ""} onChange={event => setNotes(current => ({ ...current, [document.id]: event.target.value }))} className="rounded-lg border border-[#cfdee6] bg-white px-3 py-2 text-[11px] outline-none focus:border-[#4b99b8]" placeholder="Verification note (required when asking for replacement)"/>
          <div className="flex gap-2">
            <button disabled={!!busy} onClick={() => review(document.id, "VERIFY")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf7f2] px-3 py-2 text-[10px] font-extrabold text-[#2b7c64] disabled:opacity-50">{busy === document.id + "VERIFY" ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>} Verify</button>
            <button disabled={!!busy} onClick={() => review(document.id, "REJECT")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff0f1] px-3 py-2 text-[10px] font-extrabold text-[#a44f59] disabled:opacity-50">{busy === document.id + "REJECT" ? <Loader2 size={13} className="animate-spin"/> : <XCircle size={13}/>} Replace</button>
          </div>
        </div>}
      </div>;
    })}
    {error && <p className="rounded-xl bg-[#fff1f1] px-3 py-2 text-[11px] font-semibold text-[#a84d58]">{error}</p>}
    {documents.some(document => document.verificationStatus === "REJECTED") && <p className="flex items-start gap-2 rounded-xl bg-[#fff9ef] px-3 py-2 text-[10px] leading-4 text-[#8a6a2f]"><RotateCcw size={13} className="mt-0.5 shrink-0"/>Rejected files stay in the audit history. The citizen can upload a newer replacement while the request is in Action Required.</p>}
  </div>;
}
