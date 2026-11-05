import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RequestPasswordResetForm } from "@/features/auth/components/password-recovery-form";

export const metadata: Metadata = { title: "Recover password | eLingkod Bayan", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ForgotPasswordPage() {
  return <AuthShell page="login"><RequestPasswordResetForm/></AuthShell>;
}
