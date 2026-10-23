"use client";

import { useState } from "react";
import { ExternalLink, FileText, ImageOff } from "lucide-react";

/** Preview remains authenticated: files are fetched from the same protected route as downloads. */
export function DocumentInlinePreview({
  documentId, fileName, mimeType, compact = false,
}: {
  documentId: string;
  fileName: string;
  mimeType: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = `/api/services/documents/${encodeURIComponent(documentId)}`;
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  const isPdf = mimeType === "application/pdf";
  const link = <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex max-w-full items-center gap-1.5 break-all text-[10px] font-bold text-[#257396] underline-offset-2 hover:underline"
  ><ExternalLink size={13} className="shrink-0"/> Open original: {fileName}</a>;

  return <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-[#dae7ed] bg-white p-2.5" aria-label={`Uploaded document preview: ${fileName}`}>
    {isImage && !failed ? <>
      {/* Private user uploads must bypass the public Next.js image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Uploaded document: ${fileName}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`mx-auto w-full rounded-lg bg-[#f3f7f9] object-contain ${compact ? "max-h-52" : "max-h-80"}`}
        style={{ height: "auto" }}
      />
    </> : isPdf ? <div className="overflow-hidden rounded-lg border border-[#e4ebef]">
      <iframe
        src={url}
        title={`PDF preview: ${fileName}`}
        loading="lazy"
        className={`w-full bg-white ${compact ? "h-64" : "h-96"}`}
      />
      <p className="px-2 py-1.5 text-[9px] text-[#738f9d]">PDF not displaying? Use Open original below.</p>
    </div> : <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg bg-[#f4f8fa] px-3 py-5 text-center text-[10px] text-[#76909d]">
      {failed ? <ImageOff size={18}/> : <FileText size={18}/>}
      {failed ? "Preview unavailable. You can still open the original file." : "This file type does not support an embedded preview."}
    </div>}
    <div className="mt-2 flex items-center gap-2"><FileText size={13} className="shrink-0 text-[#728d9d]"/>{link}</div>
  </div>;
}
