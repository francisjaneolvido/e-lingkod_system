import type { Metadata } from 'next';
import { requireModulePage } from '@/lib/access';
import { CensusWorkspace } from '@/features/census/components/census-workspace';
export const instant = false;
export const metadata: Metadata = { title: 'Protected Census Records | eLingkod Bayan' };
export default async function CensusPage() { const viewer = await requireModulePage('/admin/census', 'CENSUS'); return <CensusWorkspace isAdmin={viewer.role === 'ADMIN'} />; }
