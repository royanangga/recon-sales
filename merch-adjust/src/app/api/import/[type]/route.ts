import { NextRequest, NextResponse } from 'next/server';
import { q, bulkInsert } from '@/lib/db';
import { SPECS, ImportType, convert, rowOk } from '@/lib/importSpec';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Body: { action:'reset', period } lalu { action:'append', period, rows:[...] } per potongan (chunk).
export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const type = params.type as ImportType; const spec = SPECS[type];
  if (!spec) return NextResponse.json({ error: 'tipe tidak dikenal' }, { status: 404 });
  const body = await req.json(); const period: string = body.period;
  if (spec.mode === 'replace-period' && !/^\d{4}-\d{2}$/.test(period || '')) return NextResponse.json({ error: 'periode (YYYY-MM) wajib' }, { status: 400 });
  try {
    if (body.action === 'reset') {
      if (spec.mode === 'replace-period') await q(`DELETE FROM ${type} WHERE period=$1`, [period]);
      if (spec.mode === 'replace-all') await q(`TRUNCATE ${type}`);
      return NextResponse.json({ ok: true });
    }
    // sanitasi ulang di server
    const rows = (body.rows as any[]).map((r) => { const o: any = {}; for (const f of spec.fields) o[f.key] = convert(f.type, r[f.key]); return o; }).filter((o) => rowOk(type, o));
    const keys = spec.fields.map((f) => f.key);
    let inserted = 0, extra = 0;
    if (type === 'price_master') {
      inserted = await bulkInsert('price_master', keys, rows.map((o) => keys.map((k) => o[k])),
        `ON CONFLICT (item_code) DO UPDATE SET ${keys.filter((k) => k !== 'item_code').map((k) => `${k}=EXCLUDED.${k}`).join(',')} WHERE EXCLUDED.start_date > price_master.start_date`);
    } else if (type === 'po_impor') {
      const rk = (o: any) => [o.po_no, o.item_code, o.qty, o.price, o.location, o.delivery_date].join('|');
      const seen = new Set<string>(); const uniq = rows.filter((o) => { const k = rk(o); if (seen.has(k)) return false; seen.add(k); return true; });
      inserted = await bulkInsert('po_impor', ['row_key', ...keys], uniq.map((o) => [rk(o), ...keys.map((k) => o[k])]), 'ON CONFLICT (row_key) DO NOTHING');
      // turunkan daftar harga Part Impor (distinct item+PO+harga); rate diisi manual
      const pm = new Map<string, any[]>();
      for (const o of rows) if (o.price > 0) pm.set([o.item_code, o.po_no, o.price].join('|'), [o.item_code, o.description, o.po_date, o.po_no, o.price, o.curr]);
      extra = await bulkInsert('part_impor', ['item_code', 'description', 'po_date', 'po_no', 'price_yen', 'curr'], [...pm.values()], 'ON CONFLICT (item_code, po_no, price_yen) DO NOTHING');
    } else {
      const cols = ['period', ...keys, ...(type === 'po_progress' ? ['is_inhouse'] : [])];
      inserted = await bulkInsert(type, cols, rows.map((o) => [period, ...keys.map((k) => o[k]), ...(type === 'po_progress' ? [/inhouse/i.test(o.remarks || '')] : [])]));
    }
    return NextResponse.json({ ok: true, inserted, extra });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
