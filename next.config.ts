import type { NextConfig } from "next";
import { PHASE_PRODUCTION_SERVER } from "next/constants";
import { ensurePrismaClient } from "./scripts/lib/prisma-client.mjs";
import { isolatedTypeScriptConfig } from "./scripts/lib/next-typescript-config.mjs";

const distDir = process.env.ELB_NEXT_DIST_DIR || ".next";

const nextConfig: NextConfig = {
  // Isolated verification may use its own output without disrupting an active dev server.
  distDir,
  async headers() {
    return [{
      source: "/staff/activate/:path*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Commands run from the application root. Never infer a parent checkout's
    // lockfile/dependencies when validating or installing in a nested folder.
    root: process.cwd(),
    rules: {
      // Tailwind transforms the global stylesheet. Leave CSS Modules to Next.js
      // so their class-name exports remain scoped and usable by components.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function configure(phase: string): NextConfig {
  // A completed production build already carries its client. Startup must not
  // require the generation-only schema, lockfile or Prisma CLI.
  if (phase === PHASE_PRODUCTION_SERVER) return nextConfig;
  ensurePrismaClient();
  return { ...nextConfig, typescript: { tsconfigPath: isolatedTypeScriptConfig(process.cwd(), distDir) } };
}
