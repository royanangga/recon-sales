import { q } from './db';

export const ACC = {
  salesLocal: ['4110003', 'Sales Merchandise Local'], salesImport: ['4110004', 'Sales Merchandise Import'],
  purLocal: ['5221003', 'Merchandise Purchase Local'], purImport: ['5221002', 'Merchandise Purchase Import'],
  invLocal: ['5111008', 'Inventory Purchase Material - Local (Plant2)'], invImport: ['5111005', 'Inventory Purchase Material - Import (Plant2)'],
};
export type Group = 'HANWA/USC' | 'IMPOR' | 'OTHER' | 'UNMATCHED';
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Kode item penjualan berakhiran "S" (mis. 27016-120CS) -> kode pembelian (27016-120C). */
export const baseCode = (k: string) => (k || '').trim().replace(/S$/i, '');
export const supplierOf = (name: string) => (/HANWA/i.test(name || '') ? 'HANWA' : /UNITED\s*STEEL/i.test(name || '') ? 'USC' : null);

export type Inputs = {
  sl: any[]; po: any[]; gl: { ref1: string; control_account: string; amt: number }[];
  pm: Map<string, { price: number; currency_code: string }>;
  imp: Map<string, { po_no: string; po_date: string; price_yen: number; curr: string; rate: number | null }>;
  overrides: Map<string, string>;
};

export function compute(inp: Inputs) {
  // --- tabel harga beli dari PO PROGRESS (kolom bantu AG-AK di Excel) ---
  const hw = new Map<string, number>(), usc = new Map<string, number>(), sjSup = new Map<string, string>();
  const sup: Record<string, { total: number; inhouse: number }> = { HANWA: { total: 0, inhouse: 0 }, USC: { total: 0, inhouse: 0 } };
  let otherSupplierAmt = 0;
  for (const p of inp.po) {
    const s = supplierOf(p.supp_name);
    if (!s) { otherSupplierAmt += p.rec_amount || 0; continue; }
    sup[s].total += p.rec_amount || 0; if (p.is_inhouse) sup[s].inhouse += p.rec_amount || 0;
    const code = (p.product_code || '').trim(), map = s === 'HANWA' ? hw : usc;
    if (code && p.receipt_price > 0 && !map.has(code)) map.set(code, p.receipt_price);
    if (p.sj_no && !sjSup.has(p.sj_no)) sjSup.set(p.sj_no, s);
  }
  const poNet = r2(sup.HANWA.total - sup.HANWA.inhouse + sup.USC.total - sup.USC.inhouse);

  // --- klasifikasi tiap baris SL AR ---
  const lines = inp.sl.map((l) => {
    const x = baseCode(l.item_code);
    const inH = hw.has(x), inU = usc.has(x);
    let group: Group = 'UNMATCHED', source: string | null = null, buy: number | null = null, supplier: string | null = null;
    let ambiguous = false, overridden = false, rateMissing = false;
    if (inH || inU) {
      group = 'HANWA/USC'; ambiguous = inH && inU;
      const ov = inp.overrides.get(x);
      supplier = ov ?? (ambiguous ? sjSup.get(l.customer_dn_no) ?? 'HANWA' : inH ? 'HANWA' : 'USC');
      overridden = !!ov; source = supplier;
      buy = supplier === 'HANWA' ? hw.get(x)! : usc.get(x)!;
    } else if (inp.imp.has(x)) { // Part Impor harus dicek SEBELUM Price Master (price master memuat hampir semua item)
      const i = inp.imp.get(x)!; group = 'IMPOR'; source = 'PART IMPOR';
      const rate = i.curr === 'IDR' ? 1 : i.rate;
      if (rate) buy = i.price_yen * rate; else rateMissing = true;
    } else if (inp.pm.has(x)) { group = 'OTHER'; source = 'PRICE MASTER'; buy = inp.pm.get(x)!.price; }
    const purchase = buy != null ? r2(l.qty * buy) : 0;
    return { ...l, base_code: x, group, source, supplier, buy_price: buy, purchase, price_var: buy != null ? l.price - buy : null, ambiguous, overridden, rateMissing };
  });

  // --- rekonsiliasi (SL AR O1:T6) ---
  const sales = (g: Group) => r2(lines.filter((l) => l.group === g).reduce((a, l) => a + (l.dpp || 0), 0));
  const est = (g: Group) => r2(lines.filter((l) => l.group === g).reduce((a, l) => a + l.purchase, 0));
  const recon = [
    { group: 'HANWA/USC', sales: sales('HANWA/USC'), purchase: poNet, estimate: est('HANWA/USC') },
    { group: 'IMPOR', sales: sales('IMPOR'), purchase: est('IMPOR'), estimate: est('IMPOR') },
    { group: 'OTHER', sales: sales('OTHER'), purchase: est('OTHER'), estimate: est('OTHER') },
  ].map((r) => ({ ...r, variance: r2(r.sales - r.purchase) }));
  const unmatched = { sales: sales('UNMATCHED'), count: lines.filter((l) => l.group === 'UNMATCHED').length };
  const slTotal = r2(inp.sl.reduce((a, l) => a + (l.dpp || 0), 0));
  const tot = { sales: r2(recon.reduce((a, r) => a + r.sales, 0)), purchase: r2(recon.reduce((a, r) => a + r.purchase, 0)) };

  // --- jurnal adjustment purchase ---
  const [hu, im, ot] = recon;
  const pj = [
    { account: ACC.purLocal[0], name: ACC.purLocal[1], note: 'HANWA/USC', debit: hu.purchase, credit: 0 },
    { account: ACC.purImport[0], name: ACC.purImport[1], note: 'IMPOR', debit: im.purchase, credit: 0 },
    { account: ACC.purLocal[0], name: ACC.purLocal[1], note: 'LOCAL OTHER', debit: ot.purchase, credit: 0 },
    { account: ACC.invLocal[0], name: ACC.invLocal[1], note: '', debit: 0, credit: r2(hu.purchase + ot.purchase) },
    { account: ACC.invImport[0], name: ACC.invImport[1], note: '', debit: 0, credit: im.purchase },
  ];
  const purchaseJournal = { lines: pj, diff: r2(pj.reduce((a, l) => a + l.debit - l.credit, 0)) };

  // --- analisis GL sales (GL SALES I1:S6) ---
  const glBy = (acc: string) => r2(inp.gl.filter((g) => g.control_account === acc).reduce((a, g) => a + g.amt, 0));
  const ezLocal = r2(recon[0].sales + recon[2].sales), ezImport = recon[1].sales;
  const mk = (a: string[], ez: number) => { const gl = glBy(a[0]); const d = r2(ez + gl); return { account: a[0], name: a[1], ezr: ez, gl, diff: d }; };
  const rows = [mk(ACC.salesLocal, ezLocal), mk(ACC.salesImport, ezImport)];
  const glTotal = r2(inp.gl.reduce((a, g) => a + g.amt, 0));
  const salesJournal = {
    lines: rows.map((r) => ({ account: r.account, name: r.name, debit: r.diff < 0 ? -r.diff : 0, credit: r.diff > 0 ? r.diff : 0 })),
    diff: 0,
  };
  salesJournal.diff = r2(salesJournal.lines.reduce((a, l) => a + l.debit - l.credit, 0));
  // selisih per invoice (EZR vs SAP)
  const ez = new Map<string, { l: number; i: number }>(), gm = new Map<string, { l: number; i: number }>();
  for (const l of lines) { const e = ez.get(l.invoice_no) ?? { l: 0, i: 0 }; if (l.group === 'IMPOR') e.i += l.dpp; else e.l += l.dpp; ez.set(l.invoice_no, e); }
  for (const g of inp.gl) { const e = gm.get(g.ref1) ?? { l: 0, i: 0 }; if (g.control_account === ACC.salesImport[0]) e.i += g.amt; else e.l += g.amt; gm.set(g.ref1, e); }
  const invoiceDiffs: any[] = [];
  for (const k of new Set([...ez.keys(), ...gm.keys()])) {
    const a = ez.get(k) ?? { l: 0, i: 0 }, b = gm.get(k) ?? { l: 0, i: 0 };
    const dl = r2(a.l + b.l), di = r2(a.i + b.i);
    if (Math.abs(dl) > 1 || Math.abs(di) > 1) invoiceDiffs.push({ invoice_no: k, ezr_local: a.l, gl_local: -b.l, diff_local: dl, ezr_import: a.i, gl_import: -b.i, diff_import: di });
  }
  const gls = { rows, ezrTotal: r2(ezLocal + ezImport), glTotal, selisihEzrSap: r2(inp.sl.length ? slTotal + glTotal : 0), slTotal };

  const warnings: string[] = [];
  if (!inp.sl.length) warnings.push('Data SL AR periode ini belum diimport.');
  if (!inp.po.length) warnings.push('Data PO PROGRESS COIL periode ini belum diimport.');
  if (!inp.gl.length) warnings.push('Data GL SALES periode ini belum diimport.');
  if (unmatched.count) warnings.push(`${unmatched.count} baris SL AR (sales ${unmatched.sales.toLocaleString('id-ID')}) tidak ditemukan di PO Progress / Part Impor / Price Master — tidak masuk jurnal.`);
  const rm = lines.filter((l) => l.rateMissing); if (rm.length) warnings.push(`${rm.length} baris IMPOR belum punya rate Yen→IDR di menu Part Impor — pembelian dihitung 0.`);
  const am = new Set(lines.filter((l) => l.ambiguous && !l.overridden).map((l) => l.base_code)); if (am.size) warnings.push(`${am.size} item ada di HANWA dan USC sekaligus (harga bisa berbeda). Dipilih otomatis lewat S.J. No.; periksa di menu Detail.`);
  if (otherSupplierAmt) warnings.push('PO Progress memuat supplier selain HANWA/USC (diabaikan dari rekonsiliasi).');

  return {
    recon, tot, unmatched, slTotal,
    po: { HANWA: sup.HANWA, USC: sup.USC, net: poNet },
    purchaseJournal, salesJournal, gls, invoiceDiffs: invoiceDiffs.slice(0, 300), lines, warnings,
  };
}

export async function computeRecon(period: string) {
  const sl = await q(`SELECT * FROM sl_ar WHERE period=$1 ORDER BY id`, [period]);
  const po = await q(`SELECT supp_name, product_code, sj_no, receipt_price, rec_amount, is_inhouse FROM po_progress WHERE period=$1 ORDER BY id`, [period]);
  const gl = await q(`SELECT ref1, control_account, SUM(amount) amt FROM gl_sales WHERE period=$1 GROUP BY 1,2`, [period]);
  const codes = [...new Set(sl.map((l) => baseCode(l.item_code)))];
  const pmR = codes.length ? await q(`SELECT item_code, price, currency_code FROM price_master WHERE item_code = ANY($1)`, [codes]) : [];
  const imR = codes.length ? await q(`SELECT DISTINCT ON (item_code) item_code, po_no, po_date, price_yen, curr, rate FROM part_impor WHERE item_code = ANY($1) ORDER BY item_code, po_date DESC NULLS LAST, id DESC`, [codes]) : [];
  const ov = await q(`SELECT item_code, supplier FROM supplier_override WHERE period=$1`, [period]);
  return compute({
    sl, po, gl,
    pm: new Map(pmR.map((r) => [r.item_code, r])), imp: new Map(imR.map((r) => [r.item_code, r])),
    overrides: new Map(ov.map((r) => [r.item_code, r.supplier])),
  });
}
