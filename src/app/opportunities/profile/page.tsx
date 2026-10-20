import type {Metadata} from "next";
import {connection} from "next/server";
import {notFound} from "next/navigation";
import {requirePageViewer} from "@/lib/access";
import {profileForCitizen} from "@/features/jobs/server/data";
import {ProfileEditor} from "@/features/jobs/components/profile-editor";
import {SiteHeader} from "@/components/layout/site-header";
import {SiteFooter} from "@/components/layout/site-footer";
export const instant=false;
export const metadata:Metadata={title:"My Job Interests | eLingkod Bayan"};
export default async function JobProfilePage(){
 await connection();
 const viewer=await requirePageViewer("/opportunities/profile");
 if(viewer.role!=="CITIZEN")notFound();
 const profile=await profileForCitizen(viewer.id);
 return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-[#f7fafc] px-5 py-8 sm:px-8"><div className="mx-auto max-w-[940px]"><ProfileEditor initial={profile}/></div></main><SiteFooter/></>;
}
