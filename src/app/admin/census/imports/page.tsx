import type { Metadata } from 'next';
import { requireModulePage } from '@/lib/access';
import { CensusImports } from '@/features/census/components/census-imports';
export const instant = false;
export const metadata: Metadata = { title: 'Census Imports | eLingkod Bayan' };
export default async function CensusImportsPage() { await requireModulePage('/admin/census/imports', 'CENSUS'); return <CensusImports />; }
