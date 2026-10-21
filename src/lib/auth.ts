import "server-only";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { checkRegistration } from "@/features/auth/registration-validation";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "CITIZEN", input: false },
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      middleInitial: { type: "string", required: false, input: true },
      hasNoMiddleName: { type: "boolean", required: false, defaultValue: false, input: true },
      phoneNumber: { type: "string", required: false, input: true },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const body = ctx.body as Record<string, unknown> | undefined;
      const result = checkRegistration(body ?? {});
      if (!result.ok) {
        const firstError = Object.values(result.errors)[0] || "Please complete the required registration fields.";
        throw new APIError("BAD_REQUEST", { message: firstError });
      }
      const profile = result.data;
      // Never trust client-submitted `name` or `role`. The backend derives them.
      return {
        context: {
          ...ctx,
          body: {
            ...body,
            name: profile.name,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            middleInitial: profile.middleInitial,
            hasNoMiddleName: profile.hasNoMiddleName,
            phoneNumber: profile.phoneNumber,
          },
        },
      };
    }),
  },
  // For development: do not claim verified email unless verification is implemented.
  rateLimit: { enabled: true, window: 60, max: 60 },
});
