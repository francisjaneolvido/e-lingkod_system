export function Compensation({job}:{job:{payMin?:string|null;payMax?:string|null;payCurrency?:string|null;payBasis?:string|null;negotiable?:boolean|null}}){
 if(job.payMin==null||job.payMax==null||!job.payCurrency||!job.payBasis)return <p className="text-sm text-muted-foreground">Pay not provided · ask the listed contact before proceeding.</p>;
 const format=(v:string)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:job.payCurrency!,maximumFractionDigits:2}).format(Number(v));
 return <p className="font-semibold text-foreground">{format(job.payMin)}{job.payMax!==job.payMin?' – '+format(job.payMax):''} / {({HOUR:'hour',DAY:'day',MONTH:'month',YEAR:'year'} as Record<string,string>)[job.payBasis]||job.payBasis}{job.negotiable?' · Negotiable':' · Disclosed range'}</p>;
}
