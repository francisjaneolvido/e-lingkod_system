import type { Metadata } from "next";
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
  return <><SiteHeader viewer={{name:viewer.name,email:viewer.email,role:viewer.role}}/><main className="min-h-screen bg-card px-5 py-8 sm:px-8"><div className="mx-auto max-w-[900px]"><div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-muted-foreground">Account activity</p><h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">Notifications</h1><p className="mt-1 text-xs leading-6 text-muted-foreground">One place for citizen request updates, staff work offers and LGU verification activity.</p></div><NotificationCenter initialItems={feed.items} initialUnread={feed.unread}/></div></main><SiteFooter/></>;
}
