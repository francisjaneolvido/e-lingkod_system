import type { Metadata } from "next";
import Link from "next/link";
import {UtilityHeader,PageHeading} from "@/components/shared/page-layout";
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
  return <><UtilityHeader/><main className="mx-auto min-h-[calc(100vh-72px)] max-w-xl px-5 py-10"><PageHeading context="LGU staff invitation" title={valid?'Activate your staff account':'Activation link unavailable'}/><section className="elb-workspace-section">{valid?<><h2 className="text-xl font-semibold">Welcome, {invite.name}.</h2><p className="elb-help mt-3">You have been invited to {invite.department} as {invite.designation}.</p><p className="mt-3 break-all text-sm text-muted-foreground">{invite.email}</p><div className="mt-6"><StaffActivationForm token={token}/></div></>:<><p className="elb-page-description">This invitation may have expired, been revoked or already been used. Ask your Admin for a new invitation.</p><Link className="elb-button mt-6" href="/login">Return to login</Link></>}</section></main></>;
}
