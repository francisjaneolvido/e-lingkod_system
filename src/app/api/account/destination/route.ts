import { currentViewer } from "@/lib/access";
import { json } from "@/features/civic/server/http";

export async function GET() {
  const viewer = await currentViewer();
  return json({ destination: viewer && (viewer.role === "ADMIN" || viewer.role === "STAFF") ? "/admin" : "/" });
}
