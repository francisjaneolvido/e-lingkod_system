import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCitizenPageViewer } from "@/lib/access";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { citizenServiceRequest } from "@/features/services/server/data";
import { serviceForClient } from "@/features/services/catalog";
import { resolveServiceDefinition } from "@/features/services/server/catalog";
import { CitizenRequestDetail } from "@/features/services/components/citizen-request-detail";
export const instant=false;export const metadata:Metadata={title:"LGU Request | eLingkod Bayan"};
export default async function RequestPage({params}:{params:Promise<{id:string}>}){const viewer=await requireCitizenPageViewer("/services/requests");const {id}=await params;const request=await citizenServiceRequest(id,viewer.id);if(!request)notFound();const service=await resolveServiceDefinition(request.serviceKey,true);if(!service)notFound();return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-card px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1040px]"><CitizenRequestDetail request={request} service={serviceForClient(service)}/></div></main><SiteFooter/></>}
