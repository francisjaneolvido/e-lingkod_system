import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log In | E-Lingkod Bayan" };

export default function LoginPage() { return <AuthShell page="login"><LoginForm /></AuthShell>; }
