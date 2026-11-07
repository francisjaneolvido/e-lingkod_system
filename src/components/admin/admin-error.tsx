"use client";
import Link from "next/link";
import {AlertTriangle,RefreshCw} from "lucide-react";
export function AdminError({reset}:{reset:()=>void}){
 return <section role="alert" className="elb-workspace-section mx-auto max-w-2xl py-10"><AlertTriangle size={30} className="text-warning-foreground" aria-hidden="true"/><h1 className="mt-5 text-2xl font-semibold">We couldn’t open this workspace</h1><p className="elb-page-description">Your work has not been changed. Try loading the page again, or return to your profile and choose another available workspace.</p><div className="elb-page-actions mt-6"><button type="button" className="elb-button elb-button-primary" onClick={reset}><RefreshCw size={18} aria-hidden="true"/>Try again</button><Link href="/admin/profile" className="elb-button">My profile</Link></div></section>;
}
