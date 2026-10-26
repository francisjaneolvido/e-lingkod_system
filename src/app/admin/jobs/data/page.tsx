import { redirect } from 'next/navigation';
import { requireModulePage } from '@/lib/access';
export const instant=false;
export default async function LegacyPage() { await requireModulePage('/admin/census/imports','CENSUS'); redirect('/admin/census/imports'); }
