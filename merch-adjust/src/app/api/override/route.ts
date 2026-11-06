import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';
// Pilih manual harga HANWA/USC untuk item yang ada di kedua supplier. supplier=null -> kembali otomatis.
export async function POST(req: NextRequest) {
  const { period, item_code, supplier } = await req.json();
  if (!/^\d{4}-\d{2}$/.test(period) || !item_code) return NextResponse.json({ error: 'input tidak valid' }, { status: 400 });
  if (supplier === 'HANWA' || supplier === 'USC')
    await q(`INSERT INTO supplier_override(period,item_code,supplier) VALUES($1,$2,$3) ON CONFLICT (period,item_code) DO UPDATE SET supplier=$3`, [period, item_code, supplier]);
  else await q(`DELETE FROM supplier_override WHERE period=$1 AND item_code=$2`, [period, item_code]);
  return NextResponse.json({ ok: true });
}
