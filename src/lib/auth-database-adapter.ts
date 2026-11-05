import "server-only";
import type { BetterAuthOptions } from "better-auth";
import type { DBAdapter, DBTransactionAdapter } from "@better-auth/core/db/adapter";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { prisma } from "@/lib/prisma";

function authDatabaseFailure(): APIError {
  // Better Call prints unknown errors (including Prisma inputs) before returning 500.
  // A safe APIError prevents reset identifiers/password hashes entering those logs.
  return new APIError("INTERNAL_SERVER_ERROR", { message: "Authentication is temporarily unavailable. Please try again." });
}

function withAtomicTokenConsumption(adapter: DBTransactionAdapter): DBTransactionAdapter {
  const atomic: DBTransactionAdapter = {
    ...adapter,
    async consumeOne<T>(input: Parameters<DBTransactionAdapter["consumeOne"]>[0]): Promise<T | null> {
      if (input.model !== "verification") return adapter.consumeOne<T>(input);
      const row = await adapter.findOne<T & { id: string }>(input);
      if (!row) return null;
      // Prisma 7's MySQL delete-with-return can return a transaction snapshot after
      // a competing deletion. Only the actual affected-row count can spend a token.
      const removed = await adapter.deleteMany({ ...input, where: [...input.where, { field: "id", value: row.id }] });
      return removed === 1 ? row : null;
    },
  };
  return Object.fromEntries(Object.entries(atomic).map(([key, value]) => [key, typeof value === "function"
    ? async (...args: unknown[]) => {
      try { return await Reflect.apply(value, atomic, args); }
      catch { throw authDatabaseFailure(); }
    } : value])) as DBTransactionAdapter;
}

/** Keep Better Auth's transaction and token APIs; enforce its consumeOne contract on MySQL. */
export function authDatabaseAdapter(options: BetterAuthOptions): DBAdapter {
  const adapter = prismaAdapter(prisma, { provider: "mysql", transaction: true })(options);
  return {
    ...withAtomicTokenConsumption(adapter),
    transaction: async callback => {
      try { return await adapter.transaction(tx => callback(withAtomicTokenConsumption(tx))); }
      catch (error) {
        if (error instanceof APIError) throw error;
        throw authDatabaseFailure();
      }
    },
  };
}
