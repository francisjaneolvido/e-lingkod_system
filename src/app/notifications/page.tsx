import type { Metadata } from "next";
import Link from "next/link";
import { requirePageViewer } from "@/lib/access";
import { notificationFeed } from "@/lib/notifications/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { NotificationCenter } from "@/components/notifications/notification-center";

export const instant=false;
export const metadata:Metadata={title:"Notifications | eLingkod Bayan"};

export default async function NotificationsPage(){
  const viewer=await requirePageViewer("/notifications");
  const feed=await notificationFeed(viewer.id,100);
  return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="elb-account-main elb-account-wide"><Link href={viewer.role === "CITIZEN" ? "/account" : "/admin"} className="elb-account-return">Back to my account</Link><header className="elb-account-title"><div><h1>Notifications</h1><p>Read updates and follow the next step in your reports and requests.</p></div></header><NotificationCenter initialItems={feed.items} initialUnread={feed.unread}/></main><SiteFooter/></>;
}
