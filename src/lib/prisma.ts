import "server-only";
import { readFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { elbPrisma?: PrismaClient };

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is missing. Check your .env file.");
  const db = new URL(raw);
  if (db.protocol !== "mysql:") throw new Error("DATABASE_URL must start with mysql://");

  const publicKeyPath = process.env.MYSQL_RSA_PUBLIC_KEY_PATH?.trim();
  let cachingRsaPublicKey: string | undefined;
  if (publicKeyPath) {
    try {
      cachingRsaPublicKey = readFileSync(publicKeyPath, "utf8");
    } catch (cause) {
      throw new Error("MYSQL_RSA_PUBLIC_KEY_PATH is set, but its public PEM could not be read. Check the path and file permissions.", { cause });
    }
  }

  const adapter = new PrismaMariaDb({
    host: db.hostname || "127.0.0.1",
    port: Number(db.port || 3306),
    user: decodeURIComponent(db.username),
    password: decodeURIComponent(db.password),
    database: decodeURIComponent(db.pathname.slice(1)),
    connectionLimit: 5,
    ...(cachingRsaPublicKey === undefined ? {} : { cachingRsaPublicKey }),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.elbPrisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.elbPrisma = prisma;
