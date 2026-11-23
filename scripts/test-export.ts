import fs from 'fs';
import ExcelJS from 'exceljs';
import { SPECS } from '../src/lib/importSpec';
import { parseBuffer } from '../src/lib/parseWorkbook';
import { compute, baseCode } from '../src/lib/recon';
import { buildWorkbook, setCache } from '../src/lib/exportExcel';
const buf = fs.readFileSync(process.argv[2]); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
(async () => {
  const P: any = {};
  for (const t of ['sl_ar', 'gl_sales', 'po_progress', 'po_impor', 'price_master'] as const) P[t] = (await parseBuffer(ab, SPECS[t])).rows;
  const po = P.po_progress.map((r: any) => ({ ...r, is_inhouse: /inhouse/i.test(r.remarks || '') }));
  const glm = new Map<string, any>();
  for (const g of P.gl_sales) { const k = g.ref1 + '|' + g.control_account; const e = glm.get(k) ?? { ref1: g.ref1, control_account: g.control_account, amt: 0 }; e.amt += g.amount; glm.set(k, e); }
  const pm = new Map<string, any>(P.price_master.map((r: any) => [r.item_code, r]));
  const pis = [...P.po_impor].filter((o: any) => o.price > 0).map((o: any) => ({ item_code: o.item_code, description: o.description, po_date: o.po_date, po_no: o.po_no, price_yen: o.price, curr: o.curr, rate: 112.06 }))
    .sort((a: any, b: any) => (a.item_code < b.item_code ? -1 : a.item_code > b.item_code ? 1 : a.po_date < b.po_date ? 1 : -1));
  const imp = new Map<string, any>(); for (const r of pis) if (!imp.has(r.item_code)) imp.set(r.item_code, r);
  // override contoh: 1 item ganda -> paksa USC untuk menguji jalur nilai manual
  const out = compute({ sl: P.sl_ar, po, gl: [...glm.values()], pm, imp, overrides: new Map() });
  const codes = new Set(out.lines.map((l: any) => l.base_code));
  const payload = { period: '2026-10', lines: out.lines, po: P.po_progress, gl: P.gl_sales.map((g: any) => ({ ...g, amount: g.amount })), partImpor: pis, priceMaster: P.price_master.filter((r: any) => codes.has(r.item_code)) };
  for (const cache of [true, false]) {
    setCache(cache); const wb = await buildWorkbook(ExcelJS, payload);
    await wb.xlsx.writeFile(`/tmp/export_${cache ? 'cached' : 'nocache'}.xlsx`);
  }
  console.log('ok', out.lines.length, 'lines');
})();
