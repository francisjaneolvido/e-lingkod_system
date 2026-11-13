import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { providerBucket, providerLimit, type CivicProvider } from "../provider-budget-policy";
import { CivicError } from "../validation";

// Atomically count attempted provider work, including rejected photos and failed requests.
// Separate preview and submission allocations leave room for the final report after previews.
export async function consumeProviderBudget(userId: string, provider: CivicProvider, amount = 1) {
  const limit = providerLimit(provider);
  if (!Number.isInteger(amount) || amount < 1 || amount > limit) throw new CivicError("Invalid provider request.");
  const now = Date.now(), key = providerBucket(userId, provider, now);
  const increment = async (entryKey: string, value: number) => {
    let usage;
    try {
      usage = await prisma.rateLimit.upsert({ where: { key: entryKey }, create: { id: randomUUID(), key: entryKey, count: value, lastRequest: BigInt(now) }, update: { count: { increment: value }, lastRequest: BigInt(now) } });
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
      usage = await prisma.rateLimit.update({ where: { key: entryKey }, data: { count: { increment: value }, lastRequest: BigInt(now) } });
    }
    return usage.count;
  };
  const used = await increment(key, amount);
  if (used > limit) throw new CivicError("Too many photo or address checks this hour. Please wait before trying again.", 429);
  // Geoapify's free tier permits five requests per second across the entire app.
  if (provider === "GEOCODE" && await increment(`civic:geo-global:${Math.floor(now / 1000)}`, 1) > 4) throw new CivicError("Address lookup is busy. Please retry in a moment or enter it manually.", 429);
  if (Math.random() < .01) void prisma.rateLimit.deleteMany({ where: { key: { startsWith: "civic:" }, lastRequest: { lt: BigInt(now - 48 * 3_600_000) } } }).catch(() => {});
}
