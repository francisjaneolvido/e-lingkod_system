import { TrackReport } from "@/features/civic/components/track-report";
import s from "@/features/civic/civic.module.css";

/** Legacy anchor retained; tracking now looks up saved reports in MySQL. */
export function TrackingDemoSection() {
  return <section id="track-demo" className={`${s.page} scroll-mt-24`} aria-label="Track a saved civic report"><div className={s.wrap}><TrackReport /></div></section>;
}
