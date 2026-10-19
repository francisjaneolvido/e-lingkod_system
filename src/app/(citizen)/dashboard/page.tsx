import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Legacy citizen dashboard URL: use the single personalized homepage. */
export default async function OldCitizenDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=%2F");
  redirect("/");
}
