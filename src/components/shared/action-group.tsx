"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "@/styles/navigation.css";

/** Secondary workflow actions expand in place, including inside dialogs and scroll regions. */
export function ActionGroup({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!details.current?.contains(event.target as Node)) details.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  return <details ref={details} className={`elb-action-group ${className}`} onKeyDown={(event) => {
    if (event.key !== "Escape" || !event.currentTarget.open) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.open = false;
    event.currentTarget.querySelector("summary")?.focus();
  }}>
    <summary><span>{label}</span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="elb-action-group-content">{children}</div>
  </details>;
}
