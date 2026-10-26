"use client";
import { Printer } from "lucide-react";
export function PrintRequestButton(){return <button type="button" onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white print:hidden"><Printer size={14}/> Print / save PDF</button>}
