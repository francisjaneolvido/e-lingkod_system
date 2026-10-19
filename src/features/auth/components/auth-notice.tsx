import { Info } from "lucide-react";

export function AuthNotice() {
  return <div role="status" className="flex items-start gap-2.5 rounded-xl border border-[#f1dfb2] bg-[#fff9ec] px-3.5 py-3 text-[11px] leading-5 text-[#80611e]"><Info size={17} className="mt-0.5 shrink-0" /><span>UI preview only. Authentication is not connected yet, so no account details are submitted or stored.</span></div>;
}
