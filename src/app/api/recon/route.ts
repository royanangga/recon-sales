import { NextRequest, NextResponse } from 'next/server';
import { computeRecon } from '@/lib/recon';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') || '';
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: 'period tidak valid' }, { status: 400 });
  try { return NextResponse.json(await computeRecon(period)); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
