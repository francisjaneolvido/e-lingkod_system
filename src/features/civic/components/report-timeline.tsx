import { Clock3 } from "lucide-react";
import { formatReportDate, STATUS_META } from "../config";
import type { ReportEvent } from "../types";
import s from "../civic.module.css";

export function ReportTimeline({ updates, admin = false, embedded = false }: { updates: ReportEvent[]; admin?: boolean; embedded?: boolean }) {
  return <section className={embedded ? s.embeddedTimeline : s.panel} aria-labelledby="report-history-title"><div className={s.timelineHeader}><h3 id="report-history-title"><Clock3 size={15} />The progress trail</h3><p className={`${s.hint} mt-2`}>Every update, from the most recent to the first.</p></div><ol className={s.timeline}>{updates.map(event => <li key={event.id}><span className={s.timelineDot} /><div className={s.timelineTop}><strong>{STATUS_META[event.status].label}{admin && event.visibility === "INTERNAL" ? " · Internal" : ""}</strong><time dateTime={event.createdAt}>{formatReportDate(event.createdAt, true)}</time></div><p>{event.note}</p>{event.assignedOffice && <p><strong>Office:</strong> {event.assignedOffice}</p>}<small>{event.author}{admin && event.action !== "STATUS" ? ` · ${event.action.toLowerCase()}` : ""}</small></li>)}</ol></section>;
}
