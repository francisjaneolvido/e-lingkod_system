import type { Metadata } from "next";
import { currentViewer } from "@/lib/access";
import { CivicShell } from "@/features/civic/components/civic-shell";
import { TrackReport } from "@/features/civic/components/track-report";
export const metadata: Metadata = { title: "Track a report | E-Lingkod Bayan" };
export default async function TrackPage() {
  return <CivicShell viewer={await currentViewer()} active="track"><TrackReport /></CivicShell>;
}
