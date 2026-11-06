import fs from 'fs';
import { SPECS } from '../src/lib/importSpec';
import { parseBuffer } from '../src/lib/parseWorkbook';
import { compute, baseCode } from '../src/lib/recon';
const f = process.argv[2];
const buf = fs.readFileSync(f); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
(async () => {
  const P: any = {};
  for (const t of ['sl_ar', 'gl_sales', 'po_progress', 'po_impor', 'price_master'] as const) {
    const r = await parseBuffer(ab, SPECS[t]); P[t] = r;
    console.log(t, '| sheet:', r.sheet, '| header row', r.headerRow, '| rows', r.rows.length, '| skipped', r.skipped, '| missing', r.missing);
  }
  const po = P.po_progress.rows.map((r: any) => ({ ...r, is_inhouse: /inhouse/i.test(r.remarks || '') }));
  const glm = new Map<string, any>();
  for (const g of P.gl_sales.rows) { const k = g.ref1 + '|' + g.control_account; const e = glm.get(k) ?? { ref1: g.ref1, control_account: g.control_account, amt: 0 }; e.amt += g.amount; glm.set(k, e); }
  const pm = new Map<string, any>(P.price_master.rows.map((r: any) => [r.item_code, { price: r.price, currency_code: r.currency_code }]));
  const imp = new Map<string, any>();
  for (const o of [...P.po_impor.rows].sort((a: any, b: any) => (a.po_date < b.po_date ? 1 : -1))) if (o.price > 0 && !imp.has(o.item_code)) imp.set(o.item_code, { po_no: o.po_no, po_date: o.po_date, price_yen: o.price, curr: o.curr, rate: 112.06 });
  const out = compute({ sl: P.sl_ar.rows, po, gl: [...glm.values()], pm, imp, overrides: new Map() });
  console.table(out.recon); console.log('po', JSON.stringify(out.po)); console.log('unmatched', out.unmatched, 'slTotal', out.slTotal);
  console.table(out.purchaseJournal.lines); console.log('purchase diff', out.purchaseJournal.diff);
  console.table(out.gls.rows); console.table(out.salesJournal.lines); console.log('sales diff', out.salesJournal.diff, 'gl total', out.gls.glTotal, 'selisih', out.gls.selisihEzrSap, 'invoiceDiffs', out.invoiceDiffs.length);
  console.log(out.warnings);
})();
