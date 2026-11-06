import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const r = await q(`SELECT period FROM (SELECT period FROM sl_ar UNION SELECT period FROM gl_sales UNION SELECT period FROM po_progress) t ORDER BY period DESC`);
  return NextResponse.json(r.map((x) => String(x.period).trim()));
}
