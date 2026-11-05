import { redirect } from "next/navigation";
import {requirePageViewer} from '@/lib/access';
export const instant=false;

/** Legacy citizen dashboard URL: use the single personalized homepage. */
export default async function OldCitizenDashboard() {
  await requirePageViewer('/dashboard');
  redirect("/");
}
