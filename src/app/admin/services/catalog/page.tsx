import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { requireSuperAdminPage } from "@/lib/access";
import { managedServiceCatalog } from "@/features/services/server/catalog";
import { ServiceBuilder } from "@/features/services/components/service-builder";

export const instant = false;
export const metadata: Metadata = { title: "Service Management | eLingkod Bayan" };

export default async function ServiceCatalogAdminPage() {
  await requireSuperAdminPage("/admin/services/catalog");
  const services = await managedServiceCatalog();
  return <div className="space-y-5">
    <Link href="/admin/services" className="inline-flex items-center gap-2 text-xs font-bold text-foreground"><ArrowLeft size={15}/> Service Request Desk</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-[20px] border border-border bg-card p-5 sm:p-6"><div><p className="text-xs font-black uppercase tracking-[.14em] text-muted-foreground">SUPER ADMIN · SERVICE MANAGEMENT</p><h1 className="mt-1.5 text-2xl font-black text-foreground">Service Builder</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">Configure service questions, requirements, responsible office, fees, processing time, scheduling and fair staff distribution without creating a new page for every service.</p></div><span className="grid size-11 place-items-center rounded-xl bg-muted text-foreground"><Settings2 size={21}/></span></header>
    <ServiceBuilder initialServices={services as any}/>
  </div>;
}
