import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
type Snapshot = { activeRequests: number; actionRequired: number; upcoming: { scheduledAt: string; location: string; agenda: string; request: { id: string; serviceTitle: string } } | null; communityProfileComplete: boolean; recommendationsEnabled: boolean; publishedJobs: number };
export function PersonalizedWelcomeSection({ name, snapshot }: { name: string; snapshot: Snapshot }) {
  const firstName = name.trim().split(/\s+/)[0] || "Citizen";
  const entries = [
    { href: "/services/requests", label: "Active LGU requests", value: snapshot.activeRequests },
    { href: "/services/requests", label: "Action required", value: snapshot.actionRequired },
    { href: "/community-survey", label: "Community profile", value: snapshot.communityProfileComplete ? "Complete" : "Continue" },
    { href: "/opportunities", label: snapshot.recommendationsEnabled ? "Recommended opportunities" : "Available opportunities", value: snapshot.publishedJobs },
    snapshot.upcoming ? { href: `/services/requests/${snapshot.upcoming.request.id}`, label: "Upcoming appointment", value: new Date(snapshot.upcoming.scheduledAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) } : { href: "/reports", label: "My civic reports", value: "Track" },
  ];
  return <section aria-labelledby="citizen-welcome-title" className="public-section public-citizen-summary"><div className="public-container"><div className="public-section-heading"><div><h2 id="citizen-welcome-title">Welcome back, {firstName}.</h2><p>Check what needs your attention.</p></div><Link href="/account" className="elb-button public-button-secondary">My account <ArrowRight size={17} aria-hidden="true" /></Link></div><div className="public-citizen-facts">{entries.map(entry => <Link href={entry.href} key={entry.label}><span>{entry.label}</span><strong>{entry.value}</strong><ArrowRight size={16} aria-hidden="true" /></Link>)}</div>{snapshot.upcoming && <div className="public-access-note"><h3 className="flex items-center gap-2 font-semibold"><CalendarClock size={18} aria-hidden="true" />{snapshot.upcoming.request.serviceTitle}</h3><p>{new Date(snapshot.upcoming.scheduledAt).toLocaleString("en-PH")} · {snapshot.upcoming.location}</p><Link href={`/services/requests/${snapshot.upcoming.request.id}`} className="inline-flex min-h-11 items-center font-semibold underline">View schedule</Link></div>}</div></section>;
}
