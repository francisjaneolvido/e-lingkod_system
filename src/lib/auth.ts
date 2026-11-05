import "server-only";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { authDatabaseAdapter } from "@/lib/auth-database-adapter";
import { prisma } from "@/lib/prisma";
import { checkRegistration } from "@/features/auth/registration-validation";
import { isValidResetPassword, resetDestination } from "@/features/auth/password-recovery";
import { deliverPasswordReset } from "@/lib/password-reset-mail";

export const auth = betterAuth({
  // Auth diagnostics can contain client redirects or database inputs. Keep only
  // fixed categories; never log reset tokens, credential values or account state.
  logger: { level: "warn", log: level => {
    if (level === "error") console.error("Authentication request failed.");
    else if (level === "warn") console.warn("Authentication request warning.");
  } },
  onAPIError: { onError: () => { console.error("Authentication request could not be completed."); } },
  database: authDatabaseAdapter,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [new URL(resetDestination(process.env.BETTER_AUTH_URL)).origin] : [],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      try {
        await deliverPasswordReset({ email: user.email, token, origin: process.env.BETTER_AUTH_URL || "" });
      } catch {
        // Do not disclose account existence or provider details, even when delivery fails.
        // Invalidating this undelivered token leaves earlier links and account state untouched.
        try {
          await prisma.verification.deleteMany({ where: { identifier: `reset-password:${token}` } });
        } catch { /* The inaccessible token still expires; expose no credentials in diagnostics. */ }
        console.error("Password reset delivery unavailable. Check the server-only sender configuration and transport.");
      }
    },
  },
  user: {
    additionalFields: {
      identityStatus: { type: "string", required: false, defaultValue: "SUBMISSION_REQUIRED", input: false },
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
      // No identity-profile edit workflow exists. Keep review snapshots tied to
      // the account; a read-before-write check alone would race an upload/review.
      if (ctx.path === '/update-user' && ['name','firstName','lastName','middleInitial','hasNoMiddleName','phoneNumber','email','role','identityStatus','identityVersion'].some(field => Object.hasOwn(ctx.body ?? {},field))) {
        throw new APIError('FORBIDDEN',{message:'Identity details cannot be changed through this endpoint.'});
      }
      if (ctx.path === "/request-password-reset") {
        const destination = resetDestination(process.env.BETTER_AUTH_URL || "");
        const body = ctx.body as Record<string, unknown>;
        if (body.redirectTo && body.redirectTo !== destination && body.redirectTo !== "/reset-password") {
          throw new APIError("BAD_REQUEST", { message: "Use the password reset page for this site." });
        }
        return { context: { ...ctx, body: { ...body, redirectTo: destination } } };
      }
      if (ctx.path === "/reset-password" && !isValidResetPassword(ctx.body?.newPassword)) {
        throw new APIError("BAD_REQUEST", { message: "Use 12–128 characters with uppercase, lowercase, a number and a symbol." });
      }
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
            role: "CITIZEN",
            identityStatus: "SUBMISSION_REQUIRED",
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
  databaseHooks: {
    user: { create: { before: async (user) => ({ data: { ...user, role: 'CITIZEN', identityStatus: 'SUBMISSION_REQUIRED' } }) } },
  },
  // Identity review does not assert verified email.
  rateLimit: {
    enabled: true, storage: "database", window: 60, max: 60,
    customRules: {
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 10 },
    },
  },
});
