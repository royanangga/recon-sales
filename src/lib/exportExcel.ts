// Membangun workbook Excel dengan RUMUS HIDUP, meniru tata letak workbook "CEK AR & AP":
//  SL AR (tabel O1:T6, jurnal X1:AE9, kolom bantu T-AB) | GL SALES (analisis I1:S10) | PO PROGRES COIL (V1:X7, AF-AK)
//  part impor (rate manual kolom G) | price master 1026 (hanya item yang dipakai).
// Setiap sel rumus juga diberi nilai cache (result) agar terbaca di Protected View / pratinjau.
export type Payload = { period: string; lines: any[]; po: any[]; gl: any[]; partImpor: any[]; priceMaster: any[] };

const ACCT = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
const ACCT2 = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';
const DATE = 'dd-mmm-yy';
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
const FONT = { name: 'Arial', size: 10 };
const HEAD = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as any;
const SUB = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } } as any;
const dt = (s: any) => (s ? new Date(s + 'T00:00:00Z') : null);
let CACHE = true; // false hanya untuk pengujian (tanpa nilai cache)
export const setCache = (b: boolean) => { CACHE = b; };
const fv = (formula: string, result?: any): any => (!CACHE ? { formula } : { formula, result: result === undefined || (typeof result === 'number' && !Number.isFinite(result)) ? 0 : result });
const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + (f(x) || 0), 0);
const num = (v: any) => (v == null ? null : Number(v));

export async function buildWorkbook(ExcelJS: any, p: Payload) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Adjustment Merchandise';
  wb.calcProperties = { fullCalcOnLoad: true };
  const [yy, mm] = p.period.split('-'); const title = `${MON[+mm - 1]} ${yy}`;
  const sl = wb.addWorksheet('SL AR'), gl = wb.addWorksheet('GL SALES'), po = wb.addWorksheet('PO PROGRES COIL');
  const pi = wb.addWorksheet('part impor'), pm = wb.addWorksheet('price master 1026');
  for (const w of [sl, gl, po, pi, pm]) w.properties.defaultRowHeight = 14;
  const set = (ws: any, addr: string, v: any, o: { fmt?: string; bold?: boolean; fill?: any; align?: string } = {}) => {
    const c = ws.getCell(addr); c.value = v; c.font = { ...FONT, bold: !!o.bold };
    if (o.fmt) c.numFmt = o.fmt; if (o.fill) c.fill = o.fill; if (o.align) c.alignment = { horizontal: o.align };
    return c;
  };
  const header = (ws: any, row: number, names: (string | null)[], startCol = 1) =>
    names.forEach((n, i) => { if (n) set(ws, ws.getRow(row).getCell(startCol + i).address, n, { bold: true, fill: HEAD, align: 'center' }); });

  // ================= PO PROGRES COIL =================
  const P0 = 11, PL = 10 + p.po.length, PE = PL + 300;
  const nameH = p.po.find((r) => /HANWA/i.test(r.supp_name || ''))?.supp_name || 'HANWA STEEL SERVICE INDONESIA, PT';
  const nameU = p.po.find((r) => /UNITED\s*STEEL/i.test(r.supp_name || ''))?.supp_name || 'UNITED STEEL CENTER INDONESIA,PT';
  header(po, 10, ['Supp. Code', 'Supp. Name', 'PO No.', 'SJ. Posting Date', 'PO Date', 'Del. Date', 'Product Code', 'Part Number', 'Item Name', 'Dept.', 'Qty. Conv', 'Curr',
    'PO Amount', 'PO PPN', 'S.J. No.', 'Receipt Date', 'Unit (Conv.)', 'Receipt Qty (Conv.)', 'Receipt Price', 'Receipt Price Service', 'Rec Amount', 'Inv. No.', 'Inv. Price',
    'Inv. Qty (Conv.)', 'Inv. Amount', 'Inventory Price', 'Inventory Amount', 'Faktur Pajak', 'PPN', 'Outstanding', 'Remarks', 'Inhouse', 'Supp. Name', 'Product Code', 'Receipt Price', 'Product Code', 'Receipt Price']);
  set(po, 'AI9', 'hanwa', { bold: true, align: 'center' }); set(po, 'AK9', 'usc', { bold: true, align: 'center' });
  const posH = new Set<string>(), posU = new Set<string>(); // kode yang sudah punya harga (untuk hasil cache MATCH pertama)
  p.po.forEach((r, i) => {
    const n = P0 + i; const cells: [string, any, string?][] = [
      ['A', r.supp_code], ['B', r.supp_name], ['C', r.po_no], ['D', dt(r.sj_posting_date), DATE], ['E', dt(r.po_date), DATE], ['F', dt(r.del_date), DATE],
      ['G', r.product_code], ['H', r.part_number], ['I', r.item_name], ['J', r.dept], ['K', num(r.qty), ACCT], ['L', r.curr], ['M', num(r.po_amount), ACCT],
      ['O', r.sj_no], ['P', dt(r.receipt_date), DATE], ['Q', r.unit], ['R', num(r.receipt_qty), ACCT], ['S', num(r.receipt_price), ACCT2],
      ['U', num(r.rec_amount), ACCT], ['V', r.inv_no], ['Y', num(r.inv_amount), ACCT], ['AE', r.remarks]];
    for (const [c, v, f] of cells) if (v != null) set(po, c + n, v, { fmt: f });
    const isH = r.supp_name === nameH, isU = r.supp_name === nameU, pos = (r.receipt_price || 0) > 0;
    const inh = /inhouse/i.test(r.remarks || '') ? (isH ? 'HINHOUSE' : isU ? 'UINHOUSE' : '') : '';
    r._af = inh; r._ah = isH && pos ? r.product_code : ''; r._aj = isU && pos ? r.product_code : '';
    set(po, 'AF' + n, fv(`IF(ISNUMBER(SEARCH("inhouse",AE${n})),IF(B${n}=$U$3,"HINHOUSE",IF(B${n}=$U$4,"UINHOUSE","")),"")`, inh));
    set(po, 'AG' + n, fv(`IF(AH${n}<>"","hanwa",IF(AJ${n}<>"","usc",""))`, r._ah ? 'hanwa' : r._aj ? 'usc' : ''));
    set(po, 'AH' + n, fv(`IF(AND($B${n}=$U$3,N($S${n})>0),$G${n},"")`, r._ah));
    set(po, 'AI' + n, fv(`IF(AH${n}<>"",$S${n},"")`, r._ah ? num(r.receipt_price) : ''), { fmt: ACCT2 });
    set(po, 'AJ' + n, fv(`IF(AND($B${n}=$U$4,N($S${n})>0),$G${n},"")`, r._aj));
    set(po, 'AK' + n, fv(`IF(AJ${n}<>"",$S${n},"")`, r._aj ? num(r.receipt_price) : ''), { fmt: ACCT2 });
  });
  const tot = (nm: string) => sum(p.po.filter((r) => r.supp_name === nm), (r) => r.rec_amount);
  const inh = (code: string) => sum(p.po.filter((r) => r._af === code), (r) => r.rec_amount);
  set(po, 'V1', 'Merchandise Purchase Local', { bold: true }); set(po, 'W1', 'INHOUSE', { bold: true }); set(po, 'X1', 'TRIAL', { bold: true });
  set(po, 'U3', nameH); set(po, 'U4', nameU);
  const vH = tot(nameH) - inh('HINHOUSE'), vU = tot(nameU) - inh('UINHOUSE');
  set(po, 'V3', fv('SUMIF(B:B,U3,U:U)-W3-X3-Y3', vH), { fmt: ACCT }); set(po, 'V4', fv('SUMIF(B:B,U4,U:U)-W4-X4-Y4', vU), { fmt: ACCT });
  set(po, 'W3', fv('SUMIF(AF:AF,"HINHOUSE",U:U)', inh('HINHOUSE')), { fmt: ACCT }); set(po, 'W4', fv('SUMIF(AF:AF,"UINHOUSE",U:U)', inh('UINHOUSE')), { fmt: ACCT });
  set(po, 'X3', fv('SUMIF(AF:AF,"HTRIAL",U:U)', 0), { fmt: ACCT }); set(po, 'X4', fv('SUMIF(AF:AF,"UTRIAL",U:U)', 0), { fmt: ACCT });
  const poNet = vH + vU;
  set(po, 'V6', fv('SUBTOTAL(9,V2:V5)', poNet), { fmt: ACCT, bold: true, fill: SUB });
  set(po, 'W6', fv('SUBTOTAL(9,W2:W5)', inh('HINHOUSE') + inh('UINHOUSE')), { fmt: ACCT, bold: true, fill: SUB });
  set(po, 'X6', fv('SUBTOTAL(9,X2:X5)', 0), { fmt: ACCT, bold: true, fill: SUB });
  const u9 = sum(p.po, (r) => r.rec_amount);
  set(po, 'T7', 'cek (harus 0)', { align: 'right' }); set(po, 'V7', fv('V6+W6+X6+Y6-U9', poNet + inh('HINHOUSE') + inh('UINHOUSE') - u9), { fmt: ACCT });
  set(po, 'T9', 'TOTAL', { bold: true, align: 'right' });
  set(po, 'U9', fv(`SUBTOTAL(9,U${P0}:U${PE})`, u9), { fmt: ACCT, bold: true, fill: SUB });
  set(po, 'Y9', fv(`SUBTOTAL(9,Y${P0}:Y${PE})`, sum(p.po, (r) => r.inv_amount)), { fmt: ACCT, bold: true, fill: SUB });
  po.autoFilter = `A10:AK${Math.max(PL, 11)}`;
  [18, 36, 14, 14, 12, 12, 16, 16, 30, 8, 10, 6, 14, 10, 18, 12, 8, 12, 12, 8, 16, 18, 8, 8, 14, 8, 8, 8, 8, 8, 30, 12, 8, 16, 12, 16, 12].forEach((w, i) => (po.getColumn(i + 1).width = w));

  // ================= part impor =================
  set(pi, 'A2', 'PRICE LIST  PART IMPOR', { bold: true });
  set(pi, 'D1', 'Isi kolom G (Rate YEN→IDR) manual per baris. Untuk tiap item, baris PERTAMA (PO Date terbaru) yang dipakai.', { bold: false });
  header(pi, 4, ['Item Code', 'Description', 'PO Date', 'PO No (Ref No.)', 'Price', 'Price IDR', 'Rate']);
  p.partImpor.forEach((r, i) => {
    const n = 5 + i; const rate = r.rate != null ? Number(r.rate) : r.curr === 'IDR' ? 1 : null;
    set(pi, 'A' + n, r.item_code); set(pi, 'B' + n, r.description); set(pi, 'C' + n, dt(r.po_date), { fmt: DATE }); set(pi, 'D' + n, r.po_no);
    set(pi, 'E' + n, Number(r.price_yen), { fmt: ACCT2 });
    set(pi, 'F' + n, fv(`E${n}*N(G${n})`, Number(r.price_yen) * (rate || 0)), { fmt: ACCT2 });
    if (rate != null) set(pi, 'G' + n, rate, { fmt: '#,##0.00##' }); else pi.getCell('G' + n).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
  });
  pi.autoFilter = `A4:G${Math.max(4 + p.partImpor.length, 5)}`;
  [16, 40, 12, 16, 12, 14, 10].forEach((w, i) => (pi.getColumn(i + 1).width = w));

  // ================= price master 1026 =================
  set(pm, 'A1', 'Hanya item code yang dipakai di SL AR periode ini (harga dengan Start_Date terbaru).');
  header(pm, 2, ['Price_Cls', 'Item_Code', 'Trade_Code', 'Trade_Name', 'Priority_Cls', 'Currency_Code', 'Price', 'Unit_Cls', 'Start_Date', 'End_Date', 'Last_Update']);
  p.priceMaster.forEach((r, i) => {
    const n = 3 + i;
    [r.price_cls, r.item_code, r.trade_code, r.trade_name, r.priority_cls, r.currency_code].forEach((v, k) => v != null && set(pm, String.fromCharCode(65 + k) + n, v));
    set(pm, 'G' + n, Number(r.price), { fmt: ACCT2 }); set(pm, 'H' + n, r.unit_cls);
    set(pm, 'I' + n, dt(r.start_date), { fmt: DATE }); set(pm, 'J' + n, dt(r.end_date), { fmt: DATE }); set(pm, 'K' + n, r.last_update);
  });
  [10, 18, 12, 36, 10, 12, 14, 8, 12, 12, 16].forEach((w, i) => (pm.getColumn(i + 1).width = w));

  // ================= SL AR =================
  const L = p.lines, R0 = 13, RL = 12 + L.length, RE = RL + 300;
  const sjName = new Map<string, string>(); for (const r of p.po) if (r.sj_no && !sjName.has(r.sj_no)) sjName.set(r.sj_no, r.supp_name);
  header(sl, 12, ['Invoice No', 'Customer', 'Posting Date', 'Invoice Due Date', 'Faktur Pajak No', 'Delivery No', 'Customer DN No', 'Delivery Date', 'B/L No.', 'B/L Date',
    'Item Code', 'Item Name', 'Qty', 'Curr', 'Price', 'Service', 'DPP']);
  header(sl, 12, ['SUPPLIER S.J.', 'ACCOUNT', 'HANWA/USC', null, 'ITEM CODE (X)', 'PRICE', 'PURCHASE', null, 'VAR L/(R)'], 20);
  const PO = "'PO PROGRES COIL'", PI = "'part impor'", PM = "'price master 1026'";
  L.forEach((l, i) => {
    const n = R0 + i;
    const base: [string, any, string?][] = [['A', l.invoice_no], ['B', l.customer], ['C', dt(l.posting_date), DATE], ['D', dt(l.due_date), DATE], ['E', l.faktur_pajak],
      ['F', l.delivery_no], ['G', l.customer_dn_no], ['H', dt(l.delivery_date), DATE], ['I', l.bl_no], ['J', dt(l.bl_date), DATE], ['K', l.item_code], ['L', l.item_name],
      ['M', num(l.qty), ACCT], ['N', l.curr], ['O', num(l.price), ACCT], ['P', num(l.service), ACCT], ['Q', num(l.dpp), ACCT]];
    for (const [c, v, f] of base) if (v != null) set(sl, c + n, v, { fmt: f });
    const x = l.base_code, sup = sjName.get(l.customer_dn_no) ?? '';
    const vRes = l.group === 'HANWA/USC' ? (l.supplier === 'HANWA' ? 'hanwa' : 'USC') : '';
    const y = l.buy_price != null ? Number(l.buy_price) : l.group === 'UNMATCHED' ? '' : 0;
    set(sl, 'T' + n, fv(`IFERROR(INDEX(${PO}!B:B,MATCH(G${n},${PO}!O:O,0)),"")`, sup));
    set(sl, 'U' + n, fv(`IF(COUNTIF(${PO}!AH:AH,X${n})>0,"HANWA/USC",IF(COUNTIF(${PO}!AJ:AJ,X${n})>0,"HANWA/USC",IF(COUNTIF(${PI}!A:A,X${n})>0,"IMPOR",IF(COUNTIF(${PM}!B:B,X${n})>0,"OTHER","UNMATCHED"))))`, l.group));
    if (l.overridden) set(sl, 'V' + n, vRes); // pilihan manual (override) ditulis sebagai nilai
    else set(sl, 'V' + n, fv(`IF(U${n}<>"HANWA/USC","",IF(AND(COUNTIF(${PO}!AH:AH,X${n})>0,COUNTIF(${PO}!AJ:AJ,X${n})>0),IF(ISNUMBER(SEARCH("UNITED",T${n})),"USC","hanwa"),IF(COUNTIF(${PO}!AH:AH,X${n})>0,"hanwa","USC")))`, vRes));
    set(sl, 'X' + n, fv(`LEFT(K${n},LEN(K${n})-1)`, x));
    set(sl, 'Y' + n, fv(`IF(U${n}="HANWA/USC",IF(V${n}="hanwa",INDEX(${PO}!AI:AI,MATCH(X${n},${PO}!AH:AH,0)),INDEX(${PO}!AK:AK,MATCH(X${n},${PO}!AJ:AJ,0))),IF(U${n}="IMPOR",INDEX(${PI}!F:F,MATCH(X${n},${PI}!A:A,0)),IF(U${n}="OTHER",INDEX(${PM}!G:G,MATCH(X${n},${PM}!B:B,0)),"")))`, y), { fmt: ACCT2 });
    set(sl, 'Z' + n, fv(`M${n}*N(Y${n})`, Number(l.qty) * (y === '' ? 0 : y)), { fmt: ACCT });
    set(sl, 'AB' + n, fv(`IF(Y${n}="","",O${n}-Y${n})`, y === '' ? '' : Number(l.price) - y), { fmt: ACCT2 });
  });
  const grp = (g: string) => L.filter((l) => l.group === g);
  const sales = (g: string) => sum(grp(g), (l) => l.dpp), zsum = (g: string) => sum(grp(g), (l) => Number(l.qty) * (l.buy_price ?? 0));
  const slTotal = sum(L, (l) => l.dpp), zTotal = sum(L, (l) => Number(l.qty) * (l.buy_price ?? 0));
  set(sl, 'Q1', 'SALES', { bold: true, align: 'center' }); set(sl, 'R1', 'PUR', { bold: true, align: 'center' }); set(sl, 'T1', 'VAR', { bold: true, align: 'center' });
  const rows: [string, number, number, string][] = [['HANWA/USC', sales('HANWA/USC'), poNet, `${PO}!V6`], ['IMPOR', sales('IMPOR'), zsum('IMPOR'), 'SUMIF(U:U,"IMPOR",Z:Z)'], ['OTHER', sales('OTHER'), zsum('OTHER'), 'SUMIF(U:U,"other",Z:Z)']];
  rows.forEach(([g, s, r, rf], i) => {
    const n = 2 + i; set(sl, 'O' + n, g, { bold: true });
    set(sl, 'Q' + n, fv(`SUMIF(U:U,O${n},Q:Q)`, s), { fmt: ACCT }); set(sl, 'R' + n, fv(rf, r), { fmt: ACCT }); set(sl, 'T' + n, fv(`Q${n}-R${n}`, s - r), { fmt: ACCT });
  });
  const s5 = rows.reduce((a, r) => a + r[1], 0), r5 = rows.reduce((a, r) => a + r[2], 0);
  set(sl, 'Q5', fv('SUBTOTAL(9,Q2:Q4)', s5), { fmt: ACCT, bold: true, fill: SUB }); set(sl, 'R5', fv('SUBTOTAL(9,R2:R4)', r5), { fmt: ACCT, bold: true, fill: SUB });
  set(sl, 'T5', fv('SUBTOTAL(9,T2:T4)', s5 - r5), { fmt: ACCT, bold: true, fill: SUB });
  set(sl, 'O6', 'cek (harus 0)', { align: 'right' }); set(sl, 'Q6', fv('Q5+Q7-Q11', s5 + sales('UNMATCHED') - slTotal), { fmt: ACCT });
  set(sl, 'O7', 'UNMATCHED'); set(sl, 'Q7', fv('SUMIF(U:U,O7,Q:Q)', sales('UNMATCHED')), { fmt: ACCT });
  set(sl, 'P11', 'TOTAL', { bold: true, align: 'right' });
  set(sl, 'Q11', fv(`SUBTOTAL(9,Q${R0}:Q${RE})`, slTotal), { fmt: ACCT, bold: true, fill: SUB });
  set(sl, 'Z11', fv(`SUBTOTAL(9,Z${R0}:Z${RE})`, zTotal), { fmt: ACCT, bold: true, fill: SUB });
  set(sl, 'AB11', fv(`SUBTOTAL(9,AB${R0}:AB${RE})`, sum(L, (l) => (l.buy_price != null ? Number(l.price) - l.buy_price : 0))), { fmt: ACCT, bold: true, fill: SUB });
  // jurnal adjustment purchase (X1:AE9)
  set(sl, 'X1', `JURNAL ADJUSTMENT PURCHASE MERCHANDISE ${title}`, { bold: true });
  set(sl, 'AD1', 'DEBIT', { bold: true, align: 'center' }); set(sl, 'AE1', 'KREDIT', { bold: true, align: 'center' });
  const jr: [number, string, string, any, string][] = [[2, '5221003', 'Merchandise Purchase Local', fv('O2', 'HANWA/USC'), 'R2'], [3, '5221002', 'Merchandise Purchase Import', fv('O3', 'IMPOR'), 'R3'], [4, '5221003', 'Merchandise Purchase Local', 'LOCAL OTHER', 'R4']];
  jr.forEach(([n, a, nm, lab, ref], i) => { set(sl, 'X' + n, a); set(sl, 'Y' + n, nm); set(sl, 'AC' + n, lab); set(sl, 'AD' + n, fv(ref, rows[i][2]), { fmt: ACCT }); });
  set(sl, 'Y5', '5111008'); set(sl, 'Z5', 'Inventory Purchase Material - Local (Plant2)'); set(sl, 'AE5', fv('AD2+AD4', rows[0][2] + rows[2][2]), { fmt: ACCT });
  set(sl, 'Y6', '5111005'); set(sl, 'Z6', 'Inventory Purchase Material - Import (Plant2)'); set(sl, 'AE6', fv('AD3', rows[1][2]), { fmt: ACCT });
  set(sl, 'AC9', 'cek (harus 0)', { align: 'right' }); set(sl, 'AE9', fv('SUM(AD2:AD8)-SUM(AE2:AE8)', 0), { fmt: ACCT, bold: true, fill: SUB });
  sl.autoFilter = `A12:AB${Math.max(RL, 13)}`;
  [18, 34, 11, 11, 20, 20, 16, 11, 10, 10, 16, 30, 10, 6, 12, 8, 14, 3, 3, 34, 12, 12, 3, 18, 14, 12, 3, 12, 3].forEach((w, i) => (sl.getColumn(i + 1).width = w));
  sl.getColumn('O').width = 14; sl.getColumn('R').width = 16; sl.getColumn('T').width = 34;

  // ================= GL SALES =================
  const G0 = 12, GL_ = 11 + p.gl.length, GE = GL_ + 300;
  header(gl, 11, ['Posting Date', 'Due Date', 'Document Date', 'Series', 'Doc. No.', 'Trans. No.', 'Control Account', 'G/L Acct/BP Code', 'Remarks', 'Offset Acct', 'Offset Acct Name', 'Ref. 1 (Header)', 'Deb./Cred. (LC)']);
  p.gl.forEach((r, i) => {
    const n = G0 + i; const cn = /^\d+$/.test(r.control_account || '') ? Number(r.control_account) : r.control_account;
    const cells: [string, any, string?][] = [['A', dt(r.posting_date), DATE], ['B', dt(r.due_date), DATE], ['C', dt(r.doc_date), DATE], ['D', r.series], ['E', r.doc_no], ['F', r.trans_no],
      ['G', cn], ['H', r.gl_account], ['I', r.remarks], ['J', r.offset_acct], ['K', r.offset_name], ['L', r.ref1], ['M', num(r.amount), ACCT]];
    for (const [c, v, f] of cells) if (v != null) set(gl, c + n, v, { fmt: f });
  });
  const glBy = (a: string) => sum(p.gl.filter((r) => String(r.control_account) === a), (r) => r.amount);
  const ezL = sales('HANWA/USC') + sales('OTHER'), ezI = sales('IMPOR'), gL = glBy('4110003'), gI = glBy('4110004');
  set(gl, 'O1', `JURNAL ADJUSTMENT SALES MERCHANDISE ${title}`, { bold: true });
  set(gl, 'J2', 'SALES : ', { bold: true }); set(gl, 'K2', 'EZR SALES', { bold: true, align: 'center' }); set(gl, 'L2', 'GL SALES', { bold: true, align: 'center' }); set(gl, 'M2', 'D (K)', { bold: true, align: 'center' });
  set(gl, 'R2', 'D', { bold: true, align: 'center' }); set(gl, 'S2', 'K', { bold: true, align: 'center' });
  set(gl, 'I3', 4110003); set(gl, 'J3', 'LOCAL'); set(gl, 'K3', fv("'SL AR'!Q2+'SL AR'!Q4", ezL), { fmt: ACCT });
  set(gl, 'I4', 4110004); set(gl, 'J4', 'IMPOR'); set(gl, 'K4', fv("'SL AR'!Q3", ezI), { fmt: ACCT });
  set(gl, 'L3', fv('SUMIF(G:G,I3,M:M)', gL), { fmt: ACCT }); set(gl, 'L4', fv('SUMIF(G:G,I4,M:M)', gI), { fmt: ACCT });
  set(gl, 'M3', fv('K3+L3', ezL + gL), { fmt: ACCT }); set(gl, 'M4', fv('K4+L4', ezI + gI), { fmt: ACCT });
  set(gl, 'K5', fv('SUM(K3:K4)', ezL + ezI), { fmt: ACCT, bold: true, fill: SUB }); set(gl, 'L5', fv('SUM(L3:L4)', gL + gI), { fmt: ACCT, bold: true, fill: SUB });
  set(gl, 'M5', fv('SUM(M3:M4)', ezL + ezI + gL + gI), { fmt: ACCT, bold: true, fill: SUB });
  const sap = sum(p.gl, (r) => r.amount);
  set(gl, 'L8', 'SELISIH', { bold: true }); set(gl, 'M8', fv('M9+M10', slTotal + sap), { fmt: ACCT, bold: true });
  set(gl, 'L9', 'EZR'); set(gl, 'M9', fv("'SL AR'!Q11", slTotal), { fmt: ACCT });
  set(gl, 'L10', 'SAP'); set(gl, 'M10', fv(`SUBTOTAL(9,M${G0}:M${GE})`, sap), { fmt: ACCT });
  const dj = [ezL + gL, ezI + gI];
  [[3, '4110003', 'Sales Merchandise Local'], [4, '4110004', 'Sales Merchandise Import']].forEach(([n, a, nm], i) => {
    set(gl, 'O' + n, a); set(gl, 'P' + n, nm);
    set(gl, 'R' + n, fv(`MAX(-M${n},0)`, Math.max(-dj[i], 0)), { fmt: ACCT }); set(gl, 'S' + n, fv(`MAX(M${n},0)`, Math.max(dj[i], 0)), { fmt: ACCT });
  });
  set(gl, 'P5', 'TOTAL', { bold: true, align: 'right' });
  set(gl, 'R5', fv('SUM(R3:R4)', dj.reduce((a, v) => a + Math.max(-v, 0), 0)), { fmt: ACCT, bold: true, fill: SUB });
  set(gl, 'S5', fv('SUM(S3:S4)', dj.reduce((a, v) => a + Math.max(v, 0), 0)), { fmt: ACCT, bold: true, fill: SUB });
  set(gl, 'P6', 'cek (harus 0)', { align: 'right' }); set(gl, 'R6', fv('R5-S5', dj.reduce((a, v) => a + Math.max(-v, 0) - Math.max(v, 0), 0)), { fmt: ACCT });
  gl.autoFilter = `A11:M${Math.max(GL_, 12)}`;
  [12, 12, 12, 8, 14, 14, 14, 16, 26, 14, 26, 18, 18, 3, 12, 30, 3, 16, 16].forEach((w, i) => (gl.getColumn(i + 1).width = w));
  return wb;
}
