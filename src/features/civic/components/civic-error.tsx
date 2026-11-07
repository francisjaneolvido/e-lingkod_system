"use client";
import Link from "next/link";
import { RefreshCw, Unplug } from "lucide-react";
import { UtilityHeader } from "@/components/shared/page-layout";
export function CivicErrorView({ reset }: { reset: () => void }) {
  return <><UtilityHeader/><main className="elb-account-main elb-account-wide"><section className="elb-account-section" role="alert"><Unplug size={30} aria-hidden="true"/><h1 className="mt-4 text-2xl font-semibold">The action desk couldn’t load</h1><p>Your connection or the reporting service may be unavailable. Try again in a moment. Your saved reports remain in your account.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={reset} className="elb-button elb-button-primary"><RefreshCw size={17}/>Try again</button><Link href="/" className="elb-button">Back to home</Link></div></section></main></>;
}
