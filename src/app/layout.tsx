import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Lingkod Bayan | Report. Act. Resolve.",
  description:
    "A modern digital community services portal for civic reporting, government services, emergency information, jobs, and public resources.",
  keywords: ["E-Lingkod Bayan", "digital public services", "civic reporting", "community portal"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-white font-sans antialiased"><Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f7f8f5] text-[#143d62]" role="status"><div className="text-center"><p className="text-3xl font-extrabold tracking-tight">eLB<span className="text-[#b88b32]">.</span></p><p className="mt-3 text-xs text-[#718b9b]">Opening your community portal…</p></div></div>}>{children}</Suspense></body>
    </html>
  );
}
