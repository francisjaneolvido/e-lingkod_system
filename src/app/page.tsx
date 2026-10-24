import { currentViewer } from "@/lib/access";
import { LandingPage } from "@/features/landing/landing-page";

// Session-dependent default login destination must be allowed to wait for auth.
export const instant = false;

/**
 * The homepage stays at `/` for guests and signed-in citizens.
 * The session is verified by Better Auth on the server (not localStorage).
 */
export default async function Home() {
  const user = await currentViewer();
  const viewer = user
    ? { id: user.id, name: user.name, email: user.email, role: user.role }
    : null;

  return <LandingPage viewer={viewer} />;
}
