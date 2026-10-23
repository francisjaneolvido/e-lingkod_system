"use client";
import Image from "next/image";
import { useState } from "react";

export function DocumentInlinePreview({documentId,fileName,mimeType,compact=false}:{documentId:string;fileName:string;mimeType:string;compact?:boolean}){
  const [open,setOpen]=useState(false),url=`/api/services/documents/${encodeURIComponent(documentId)}`;
  const image=["image/jpeg","image/png","image/webp"].includes(mimeType),pdf=mimeType==="application/pdf";
  return <div className={compact?"mt-3":"mt-4"}>{image||pdf?<><button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)} className="rounded-2xl border border-[#DFE9F2] px-4 py-2 text-xs font-semibold text-[#103C64]">{open?"Close preview":"Preview document"}</button>{open?<div className="mt-3 overflow-hidden rounded-2xl border border-[#DFE9F2] bg-[#F8FBFE]">{image?<Image src={url} alt={`Uploaded document: ${fileName}`} width={1000} height={800} unoptimized className="h-auto max-h-[600px] w-full object-contain"/>:<iframe title={`Document preview: ${fileName}`} src={url} sandbox="allow-same-origin" referrerPolicy="no-referrer" className="h-[500px] w-full"/>}</div>:null}</>:<p className="text-xs text-[#56718B]">Inline preview is unavailable for this file type.</p>}<a href={url} target="_blank" rel="noopener noreferrer" className="ml-3 text-xs font-semibold text-[#1A78B4]">Open / download {fileName}</a></div>;
}
