import type {ReactNode} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ThemeControl} from './theme-control';

export function PageHeading({title,description,context,actions}:{title:string;description?:ReactNode;context?:string;actions?:ReactNode}){
 return <header className="elb-page-heading"><div>{context&&<p className="elb-context-label">{context}</p>}<h1>{title}</h1>{description&&<p className="elb-page-description">{description}</p>}</div>{actions&&<div className="elb-page-actions">{actions}</div>}</header>;
}
export function UtilityHeader({children}:{children?:ReactNode}){
 return <header className="elb-utility-header"><div><Link href="/" className="elb-utility-brand"><Image src="/images/elb-mark.svg" alt="" width={32} height={37}/><span>eLingkod Bayan</span></Link><div className="elb-utility-actions">{children}<ThemeControl/></div></div></header>;
}
export function EmptyState({title,children,actions}:{title:string;children:ReactNode;actions?:ReactNode}){
 return <section className="elb-empty-state"><div className="elb-empty-mark" aria-hidden="true">eLB</div><h2>{title}</h2><p>{children}</p>{actions&&<div className="elb-page-actions">{actions}</div>}</section>;
}
