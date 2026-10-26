import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = { inverted?: boolean; compact?: boolean };

export function BrandLogo({ inverted = false, compact = false }: BrandLogoProps) {
  return (
    <Link href="/" className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400" aria-label="E-Lingkod Bayan — home">
      <Image src="/images/elb-mark.svg" alt="" width={47} height={53} className={`h-11 w-10 shrink-0 rounded-lg transition-transform group-hover:-translate-y-0.5 dark:bg-white dark:p-1 sm:h-12 sm:w-11 ${inverted ? "bg-white p-1" : ""}`} priority />
      {!compact && <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`text-[22px] font-extrabold leading-[1.05] tracking-[-0.055em] ${inverted ? "text-white" : "text-foreground"}`}>e<span className={inverted ? "text-white" : "text-foreground"}>LB</span></span>
        <span className={`text-xs font-bold leading-none tracking-[-0.012em] sm:text-xs ${inverted ? "text-white/85" : "text-foreground"}`}>eLingkod Bayan</span>
      </span>}
    </Link>
  );
}
