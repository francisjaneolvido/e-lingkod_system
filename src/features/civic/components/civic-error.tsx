"use client";
import Link from "next/link";
import { RefreshCw, Unplug } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import s from "../civic.module.css";
export function CivicErrorView({ reset }: { reset: () => void }) {
  return <main className={s.page}><div className={`${s.wrap} pt-7`}><BrandLogo /><div className={s.setupError}><Unplug size={30} strokeWidth={1.6} /><h2>The action desk couldn&apos;t load.</h2><p>Your connection or the reporting service may be unavailable. Try again in a moment. Your saved reports remain in your account.</p><div className={s.actions}><button type="button" onClick={reset} className={s.primary}><RefreshCw size={15} />Try again</button><Link href="/" className={s.secondary}>Back to home</Link></div></div></div></main>;
}
