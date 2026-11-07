'use client';
import Link from 'next/link';
import {UtilityHeader} from '@/components/shared/page-layout';
export default function VerificationError({reset}:{reset:()=>void}) {
  return <><UtilityHeader/><main className="elb-account-main elb-account-wide"><section className="elb-account-section elb-workflow-panel" role="alert"><h1 className="mt-3 text-2xl font-semibold">Verification status is unavailable</h1><p>Your submission has not been changed. Retry to check the current status before uploading again.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className="elb-button elb-button-primary" onClick={reset}>Retry status</button><Link href="/" className="elb-button">Back to home</Link></div></section></main></>;
}
