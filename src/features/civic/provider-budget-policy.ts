import { createHash } from "node:crypto";

export type CivicProvider = "AI_PREVIEW" | "AI_SUBMIT" | "GEOCODE";
const limits: Record<CivicProvider, number> = { AI_PREVIEW: 18, AI_SUBMIT: 30, GEOCODE: 30 };
export function providerLimit(provider: CivicProvider) { return limits[provider]; }
export function providerBucket(userId: string, provider: CivicProvider, time: number) {
  return `civic:${provider}:${createHash("sha256").update(userId).digest("hex").slice(0, 32)}:${Math.floor(time / 3_600_000)}`;
}
