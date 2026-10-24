// Legacy URL uses exactly the protected analytics/export contract.
import { GET as protectedExport } from '@/app/api/admin/census/analytics/export/route';
export async function GET(request:Request) { return protectedExport(request); }
