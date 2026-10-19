"use client";
import { createAuthClient } from "better-auth/react";

// Same-origin /api/auth. No public secret or database credentials in browser.
export const authClient = createAuthClient();
