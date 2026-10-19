import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Register | E-Lingkod Bayan" };

export default function RegisterPage() { return <AuthShell page="register"><RegisterForm /></AuthShell>; }
