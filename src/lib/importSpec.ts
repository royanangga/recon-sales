// Spesifikasi kolom tiap file import. Kolom dikenali dari NAMA JUDUL (bukan posisi), jadi aman jika format bergeser.
export type FType = 'text' | 'num' | 'date';
export type Field = { key: string; label: string; aliases: string[]; type: FType; required?: boolean };
export type ImportType = 'sl_ar' | 'gl_sales' | 'po_progress' | 'po_impor' | 'price_master';
export type Spec = {
  type: ImportType; title: string; desc: string; mode: 'replace-period' | 'append' | 'replace-all';
  sheetHints: string[]; fields: Field[];
};

export const norm = (s: any) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const f = (key: string, label: string, type: FType, aliases: string[] = [], required = false): Field =>
  ({ key, label, type, aliases: [norm(label), ...aliases.map(norm)], required });

export const SPECS: Record<ImportType, Spec> = {
  gl_sales: {
    type: 'gl_sales', title: 'GL SALES', mode: 'replace-period', sheetHints: ['glsales'],
    desc: 'General Ledger sales dari SAP. Menggantikan data periode yang sama.',
    fields: [
      f('posting_date', 'Posting Date', 'date'), f('due_date', 'Due Date', 'date'), f('doc_date', 'Document Date', 'date'),
      f('series', 'Series', 'text'), f('doc_no', 'Doc. No.', 'text'), f('trans_no', 'Trans. No.', 'text'),
      f('control_account', 'Control Account', 'text', [], true), f('gl_account', 'G/L Acct/BP Code', 'text'),
      f('remarks', 'Remarks', 'text'), f('offset_acct', 'Offset Acct', 'text'), f('offset_name', 'Offset Acct Name', 'text'),
      f('ref1', 'Ref. 1 (Header)', 'text', ['Ref. 1'], true), f('amount', 'Deb./Cred. (LC)', 'num', ['Deb./Cred.'], true),
    ],
  },
  sl_ar: {
    type: 'sl_ar', title: 'SL AR', mode: 'replace-period', sheetHints: ['slar'],
    desc: 'Invoice Summary List dari EZ Runner. Menggantikan data periode yang sama.',
    fields: [
      f('invoice_no', 'Invoice No', 'text', [], true), f('customer', 'Customer', 'text'), f('posting_date', 'Posting Date', 'date'),
      f('due_date', 'Invoice Due Date', 'date'), f('faktur_pajak', 'Faktur Pajak No', 'text'), f('delivery_no', 'Delivery No', 'text'),
      f('customer_dn_no', 'Customer DN No', 'text', [], true), f('delivery_date', 'Delivery Date', 'date'),
      f('bl_no', 'B/L No.', 'text'), f('bl_date', 'B/L Date', 'date'), f('item_code', 'Item Code', 'text', [], true),
      f('item_name', 'Item Name', 'text'), f('qty', 'Qty', 'num', [], true), f('curr', 'Curr', 'text'), f('price', 'Price', 'num'),
      f('service', 'Service', 'num'), f('dpp', 'DPP', 'num', [], true),
    ],
  },
  po_progress: {
    type: 'po_progress', title: 'PO PROGRESS COIL', mode: 'replace-period',
    sheetHints: ['poprogrescoil', 'poprogresscoil', 'poprogres'],
    desc: 'Purchase Order Progress (HANWA & UNITED STEEL). Menggantikan data periode yang sama. Remarks "inhouse" otomatis dipisahkan.',
    fields: [
      f('supp_code', 'Supp. Code', 'text'), f('supp_name', 'Supp. Name', 'text', [], true), f('po_no', 'PO No.', 'text'),
      f('sj_posting_date', 'SJ. Posting Date', 'date'), f('po_date', 'PO Date', 'date'), f('del_date', 'Del. Date', 'date'),
      f('product_code', 'Product Code', 'text', [], true), f('part_number', 'Part Number', 'text'), f('item_name', 'Item Name', 'text'),
      f('dept', 'Dept.', 'text'), f('qty', 'Qty. Conv', 'num'), f('curr', 'Curr', 'text'), f('po_amount', 'PO Amount', 'num'),
      f('sj_no', 'S.J. No.', 'text', [], true), f('receipt_date', 'Receipt Date', 'date'), f('unit', 'Unit (Conv.)', 'text'),
      f('receipt_qty', 'Receipt Qty (Conv.)', 'num'), f('receipt_price', 'Receipt Price', 'num', [], true),
      f('rec_amount', 'Rec Amount', 'num', [], true), f('inv_no', 'Inv. No.', 'text'), f('inv_amount', 'Inv. Amount', 'num'),
      f('remarks', 'Remarks', 'text', [], true),
    ],
  },
  po_impor: {
    type: 'po_impor', title: 'PO Impor (FJJ)', mode: 'append', sheetHints: ['poimpor'],
    desc: 'PO dari supplier FJJ (YEN). Hanya MENAMBAH data; baris yang sudah ada dilewati. Harga otomatis masuk ke Part Impor.',
    fields: [
      f('po_no', 'PO No (Ref No.)', 'text', ['PO No'], true), f('location', 'Location', 'text'), f('kanban', 'Kanban Cls', 'text'),
      f('po_date', 'PO Date', 'date', [], true), f('delivery_date', 'Delivery Date', 'date'), f('supp_code', 'Supplier Code', 'text'),
      f('supp_name', 'Supplier Name', 'text'), f('part_number', 'Part Number', 'text'), f('item_code', 'Item Code', 'text', [], true),
      f('description', 'Description', 'text'), f('unit', 'Unit Conv', 'text'), f('qty', 'Qty Conv', 'num'), f('curr', 'Curr', 'text'),
      f('price', 'Price', 'num', [], true), f('sub_total', 'Sub Total', 'num'), f('discount', 'Discount', 'num'),
      f('total', 'Total Amount', 'num'), f('fix', 'Fix', 'text'),
    ],
  },
  price_master: {
    type: 'price_master', title: 'PRICE MASTER', mode: 'replace-all', sheetHints: ['pricemaster'],
    desc: 'Price master (sangat besar). Hanya harga dengan Start_Date terbaru per Item_Code yang disimpan. Menggantikan seluruh data lama.',
    fields: [
      f('price_cls', 'Price_Cls', 'text'), f('item_code', 'Item_Code', 'text', [], true), f('trade_code', 'Trade_Code', 'text'),
      f('trade_name', 'Trade_Name', 'text'), f('priority_cls', 'Priority_Cls', 'text'), f('currency_code', 'Currency_Code', 'text'),
      f('price', 'Price', 'num', [], true), f('unit_cls', 'Unit_Cls', 'text'), f('start_date', 'Start_Date', 'date', [], true),
      f('end_date', 'End_Date', 'date'), f('last_update', 'Last_Update', 'text'),
    ],
  },
};

// ---- konversi nilai sel ----
export function toNum(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const s = String(v).replace(/[,\s]/g, '');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
const pad = (n: number) => String(n).padStart(2, '0');
function valid(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 9999) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
export function toDate(v: any): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    if (v >= 19000101 && v <= 99991231) return valid(Math.floor(v / 10000), Math.floor((v % 10000) / 100), v % 100);
    if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
    return null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/); if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return valid(y, +m[2], +m[1]); }
  return null;
}
export const toText = (v: any): string | null => {
  if (v == null) return null;
  const s = (typeof v === 'number' ? String(v) : String(v)).trim();
  return s === '' ? null : s;
};
export function convert(type: FType, v: any) { return type === 'num' ? toNum(v) : type === 'date' ? toDate(v) : toText(v); }

/** Apakah baris berisi data valid (bukan judul seksi / subtotal). */
export function rowOk(t: ImportType, r: Record<string, any>): boolean {
  switch (t) {
    case 'sl_ar': return !!r.item_code && !!r.invoice_no && r.qty != null;
    case 'gl_sales': return /^\d+$/.test(r.control_account || '') && r.amount != null && !!r.doc_no;
    case 'po_progress': return !!r.supp_name && !!r.product_code;
    case 'po_impor': return !!r.po_no && !!r.item_code && r.price != null;
    case 'price_master': return !!r.item_code && r.price != null && r.price > 0 && !!r.start_date;
  }
}
