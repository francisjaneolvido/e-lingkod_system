"use client";
import Image from "next/image";
import { useState } from "react";

export function DocumentInlinePreview({documentId,fileName,mimeType,compact=false}:{documentId:string;fileName:string;mimeType:string;compact?:boolean}){
  const [open,setOpen]=useState(false),url=`/api/services/documents/${encodeURIComponent(documentId)}`;
  const image=["image/jpeg","image/png","image/webp"].includes(mimeType),pdf=mimeType==="application/pdf";
  return <div className={(compact?"mt-3":"mt-4")+" min-w-0 space-y-2"}>{image?<><button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)} className="rounded-2xl border border-border px-4 py-2 text-xs font-semibold text-foreground">{open?"Close preview":"Preview document"}</button>{open?<div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card"><Image src={url} alt={`Uploaded document: ${fileName}`} width={1000} height={800} unoptimized className="h-auto max-h-[600px] w-full object-contain"/></div>:null}</>:<p className="text-xs text-muted-foreground">{pdf?"Open this PDF in your browser's document viewer or download it.":"Inline preview is unavailable for this file type."}</p>}<a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 max-w-full items-center break-all text-xs font-semibold text-muted-foreground">{pdf?"Open PDF / download ":"Open / download "}{fileName}</a></div>;
}
