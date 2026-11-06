import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams; const s = (sp.get('q') || '').trim(); const missing = sp.get('missing') === '1';
  const page = Math.max(0, +(sp.get('page') || 0)); const size = 200;
  const where = `WHERE ($1 = '' OR item_code ILIKE '%'||$1||'%' OR description ILIKE '%'||$1||'%' OR po_no ILIKE '%'||$1||'%') ${missing ? "AND rate IS NULL AND COALESCE(curr,'')<>'IDR'" : ''}`;
  const rows = await q(`SELECT id,item_code,description,po_date,po_no,price_yen,curr,rate, price_yen*rate AS price_idr FROM part_impor ${where}
    ORDER BY item_code, po_date DESC NULLS LAST, id DESC LIMIT ${size} OFFSET ${page * size}`, [s]);
  const [c] = await q(`SELECT COUNT(*) n, COUNT(*) FILTER (WHERE rate IS NULL AND COALESCE(curr,'')<>'IDR') nm FROM part_impor`);
  const [f] = await q(`SELECT COUNT(*) n FROM part_impor ${where}`, [s]);
  return NextResponse.json({ rows, total: c.n, missing: c.nm, filtered: f.n, size });
}

// PATCH {id, rate} -> satu baris | {month:'YYYY-MM', rate, onlyEmpty} -> massal per bulan PO Date | {all:true, rate, onlyEmpty}
export async function PATCH(req: NextRequest) {
  const b = await req.json(); const rate = b.rate === '' || b.rate == null ? null : Number(b.rate);
  if (rate !== null && !(rate > 0)) return NextResponse.json({ error: 'rate harus > 0' }, { status: 400 });
  if (b.id) { await q(`UPDATE part_impor SET rate=$1 WHERE id=$2`, [rate, b.id]); return NextResponse.json({ ok: true }); }
  const cond = b.all ? 'TRUE' : `to_char(po_date,'YYYY-MM') = $2`; const params: any[] = [rate]; if (!b.all) params.push(b.month);
  const res = await q(`UPDATE part_impor SET rate=$1 WHERE ${cond} ${b.onlyEmpty ? 'AND rate IS NULL' : ''} RETURNING id`, params);
  return NextResponse.json({ ok: true, updated: res.length });
}
