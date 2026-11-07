import Link from 'next/link';
import {UtilityHeader} from '@/components/shared/page-layout';
export default function NotFound(){
 return <><UtilityHeader/><main className="mx-auto grid min-h-[70vh] max-w-2xl content-center gap-5 px-6 py-12 text-foreground"><p className="elb-context-label">Page unavailable</p><h1 className="text-4xl font-semibold">Let’s find your next step.</h1><p className="elb-page-description">This address may have changed, or your account may not have access. Return home to find the services available to you.</p><div className="elb-page-actions"><Link href="/" className="elb-button elb-button-primary">Return home</Link><Link href="/services" className="elb-button">Browse services</Link></div></main></>;
}
