import type { Metadata } from "next";
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
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
