import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { StaffActivationForm } from "@/components/admin/staff-activation-form";
import { hashInvitationToken, STAFF_INVITE_TOKEN_RE } from "@/lib/staff-invitations";

export const instant = false;
export const metadata: Metadata = { title: "LGU Staff Activation | eLingkod Bayan", robots: { index: false, follow: false } };
export default async function StaffActivationPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const invite = STAFF_INVITE_TOKEN_RE.test(token) ? await prisma.staffInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: { name: true, email: true, department: true, designation: true, expiresAt: true, activatedAt: true, revokedAt: true },
  }) : null;
  const valid = !!invite && !invite.activatedAt && !invite.revokedAt && invite.expiresAt > new Date();
  return <main className="grid min-h-screen place-items-center bg-muted px-5 py-12"><section className="w-full max-w-[475px] space-y-6 rounded-[24px] border border-border bg-card p-6 shadow-[0_20px_65px_rgba(35,91,125,0.10)] sm:p-9"><div className="flex items-center gap-3"><Image src="/images/elb-mark.svg" alt="eLingkod Bayan logo" width={54} height={58}/><div><h1 className="text-xl font-extrabold tracking-tight text-foreground">eLingkod Bayan</h1><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">LGU Staff Activation</p></div></div>{valid && invite ? <><div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-foreground">Official staff invitation</p><h2 className="mt-1 text-2xl font-extrabold text-foreground">Welcome, {invite.name}!</h2><p className="mt-2 text-sm text-muted-foreground">You have been invited to join <strong className="text-foreground">{invite.department}</strong> as {invite.designation}.</p><p className="mt-2 break-all text-[12px] text-muted-foreground">Account: {invite.email}</p></div><StaffActivationForm token={token}/></> : <><h2 className="text-xl font-extrabold text-foreground">Activation link unavailable</h2><p className="text-sm leading-7 text-muted-foreground">This invitation may be expired, revoked, or already used. Ask your LGU Super Admin to send a new invitation.</p><Link href="/login" className="inline-flex text-sm font-bold text-foreground hover:underline">Go to login</Link></>}</section></main>;
}
