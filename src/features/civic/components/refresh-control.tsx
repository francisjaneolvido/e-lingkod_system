"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import s from "../civic.module.css";

export function RefreshControl({ auto = false }: { auto?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!auto) return;
    function refresh() { if (document.visibilityState === "visible") startTransition(() => router.refresh()); }
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [auto, router]);
  return <span className={s.refreshLine}>{auto && <span className={s.liveDot}>Checks for updates every 30 seconds</span>}<button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={11} className={pending ? s.spin : ""} />{pending ? "Refreshing…" : "Refresh"}</button></span>;
}
