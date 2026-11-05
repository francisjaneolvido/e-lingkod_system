
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Allow the 12-second mail timeout and subsequent token cleanup to finish on
// hosts that enforce a route lifetime for Next's after() background tasks.
export const maxDuration = 30;

export const { GET, POST } = toNextJsHandler(auth);
