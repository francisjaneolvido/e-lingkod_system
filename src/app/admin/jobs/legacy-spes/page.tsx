import Link from 'next/link';
import { requireModulePage } from '@/lib/access';
import { legacySpesImportData } from '@/features/analytics/server/legacy-spes';
import { SpesImportWorkspace } from '@/features/jobs/components/spes-import-workspace';
export const instant=false;
export default async function LegacySpesPage() { const viewer=await requireModulePage('/admin/jobs/legacy-spes','CENSUS');const data=await legacySpesImportData(viewer);return <div className="space-y-6"><section className="rounded-[22px] border border-[#DFE9F2] bg-white p-6"><h1 className="text-2xl font-bold text-[#103C64]">Historical SPES imports</h1><p className="mt-3 text-sm leading-6 text-[#56718B]">Batch management is protected by CENSUS permission. Staff see their own batches and only currently authorized row counts. This is source provenance, not a count of unique people.</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#1A78B4]" href="/admin/census/analytics?population=SPES">View scoped source analytics</Link></section><SpesImportWorkspace batches={data.batches} batchCount={data.batchCount} isSuperAdmin={viewer.role==='ADMIN'}/></div>; }
