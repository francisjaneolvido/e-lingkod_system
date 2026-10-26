import type { Metadata } from "next";
import { Suspense } from "react";
import { demoEnvironment } from "@/lib/demo-environment";
import "./globals.css";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { ThemeControl } from "@/components/shared/theme-control";

export const metadata: Metadata = {
  title: "E-Lingkod Bayan | Report. Act. Resolve.",
  description:
    "A modern digital community services portal for civic reporting, government services, emergency information, jobs, and public resources.",
  keywords: ["E-Lingkod Bayan", "digital public services", "civic reporting", "community portal"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = demoEnvironment({ ELB_DEMO_MODE: process.env.ELB_DEMO_MODE, DATABASE_URL: process.env.DATABASE_URL });
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head><script id="elb-theme-initializer" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} /></head>
      <body className="min-h-screen bg-background font-sans antialiased"><ThemeControl />{demo && <aside aria-label="Demo environment" className="border-b border-border bg-muted px-4 py-3 text-center text-sm font-semibold text-foreground">{demo.label} · Reference year 2026 · Do not enter real personal data.</aside>}<Suspense fallback={<div className="grid min-h-screen place-items-center bg-muted text-foreground" role="status"><div className="text-center"><p className="text-3xl font-extrabold tracking-tight">eLB<span className="text-warning-foreground">.</span></p><p className="mt-3 text-xs text-muted-foreground">Opening your community portal…</p></div></div>}>{children}</Suspense></body>
    </html>
  );
}
