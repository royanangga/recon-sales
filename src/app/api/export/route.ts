import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { computeRecon } from '@/lib/recon';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Data mentah satu periode untuk membangun workbook Excel (rumus dibuat di browser).
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || '';
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'period tidak valid' }, { status: 400 });
  try {
    const r = await computeRecon(period);
    const po = await q(`SELECT supp_code,supp_name,po_no,sj_posting_date,po_date,del_date,product_code,part_number,item_name,dept,qty,curr,po_amount,
      sj_no,receipt_date,unit,receipt_qty,receipt_price,rec_amount,inv_no,inv_amount,remarks FROM po_progress WHERE period=$1 ORDER BY id`, [period]);
    const gl = await q(`SELECT posting_date,due_date,doc_date,series,doc_no,trans_no,control_account,gl_account,remarks,offset_acct,offset_name,ref1,amount
      FROM gl_sales WHERE period=$1 ORDER BY id`, [period]);
    const partImpor = await q(`SELECT item_code,description,po_date,po_no,price_yen,curr,rate FROM part_impor ORDER BY item_code, po_date DESC NULLS LAST, id DESC`);
    const codes = [...new Set(r.lines.map((l: any) => l.base_code))];
    const priceMaster = codes.length ? await q(`SELECT price_cls,item_code,trade_code,trade_name,priority_cls,currency_code,price,unit_cls,start_date,end_date,last_update
      FROM price_master WHERE item_code = ANY($1) ORDER BY item_code`, [codes]) : [];
    return NextResponse.json({ period, lines: r.lines, po, gl, partImpor, priceMaster });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
