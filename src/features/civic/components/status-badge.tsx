import { STATUS_META, type ReportStatus } from "../config";
import s from "../civic.module.css";

export function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status];
  return <span className={`${s.badge} ${s[meta.tone]}`}>{meta.label}</span>;
}
