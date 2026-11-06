import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || '';
  const rows = await q(`SELECT supp_name, po_no, sj_no, receipt_date, product_code, item_name, receipt_qty, receipt_price, rec_amount, remarks
    FROM po_progress WHERE period=$1 AND is_inhouse ORDER BY supp_name, receipt_date, id LIMIT 3000`, [period]);
  return NextResponse.json(rows);
}
