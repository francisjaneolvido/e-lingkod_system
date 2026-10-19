import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/features/landing/landing-page";

/**
 * The homepage stays at `/` for guests and signed-in citizens.
 * The session is verified by Better Auth on the server (not localStorage).
 */
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const viewer = session
    ? { name: session.user.name, email: session.user.email }
    : null;

  return <LandingPage viewer={viewer} />;
}
