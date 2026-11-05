import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/password-recovery-form";

export const metadata: Metadata = { title: "Reset password | eLingkod Bayan", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return <AuthShell page="login"><ResetPasswordForm/></AuthShell>;
}
