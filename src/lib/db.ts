import { Pool, types } from 'pg';

types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number
types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint -> number
types.setTypeParser(1082, (v) => v); // date -> 'YYYY-MM-DD'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const g = globalThis as any;
export const pool: Pool =
  g.__pool ??
  (g.__pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: url && !/localhost|127\.0\.0\.1/.test(url) ? { rejectUnauthorized: false } : undefined,
  }));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS gl_sales (
  id SERIAL PRIMARY KEY, period CHAR(7) NOT NULL,
  posting_date DATE, due_date DATE, doc_date DATE, series TEXT, doc_no TEXT, trans_no TEXT,
  control_account TEXT, gl_account TEXT, remarks TEXT, offset_acct TEXT, offset_name TEXT, ref1 TEXT,
  amount NUMERIC(24,4) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS gl_sales_period ON gl_sales(period);
CREATE TABLE IF NOT EXISTS sl_ar (
  id SERIAL PRIMARY KEY, period CHAR(7) NOT NULL,
  invoice_no TEXT, customer TEXT, posting_date DATE, due_date DATE, faktur_pajak TEXT, delivery_no TEXT,
  customer_dn_no TEXT, delivery_date DATE, bl_no TEXT, bl_date DATE, item_code TEXT, item_name TEXT,
  qty NUMERIC(24,4), curr TEXT, price NUMERIC(24,4), service NUMERIC(24,4), dpp NUMERIC(24,4)
);
CREATE INDEX IF NOT EXISTS sl_ar_period ON sl_ar(period);
CREATE TABLE IF NOT EXISTS po_progress (
  id SERIAL PRIMARY KEY, period CHAR(7) NOT NULL,
  supp_code TEXT, supp_name TEXT, po_no TEXT, sj_posting_date DATE, po_date DATE, del_date DATE,
  product_code TEXT, part_number TEXT, item_name TEXT, dept TEXT, qty NUMERIC(24,4), curr TEXT,
  po_amount NUMERIC(24,4), sj_no TEXT, receipt_date DATE, unit TEXT, receipt_qty NUMERIC(24,4),
  receipt_price NUMERIC(24,4), rec_amount NUMERIC(24,4), inv_no TEXT, inv_amount NUMERIC(24,4),
  remarks TEXT, is_inhouse BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS po_progress_period ON po_progress(period);
CREATE TABLE IF NOT EXISTS po_impor (
  id SERIAL PRIMARY KEY, row_key TEXT UNIQUE NOT NULL,
  po_no TEXT, location TEXT, kanban TEXT, po_date DATE, delivery_date DATE, supp_code TEXT, supp_name TEXT,
  part_number TEXT, item_code TEXT, description TEXT, unit TEXT, qty NUMERIC(24,4), curr TEXT,
  price NUMERIC(24,4), sub_total NUMERIC(24,4), discount NUMERIC(24,4), total NUMERIC(24,4), fix TEXT
);
CREATE TABLE IF NOT EXISTS part_impor (
  id SERIAL PRIMARY KEY, item_code TEXT NOT NULL, description TEXT, po_date DATE, po_no TEXT NOT NULL,
  price_yen NUMERIC(24,4) NOT NULL, curr TEXT, rate NUMERIC(18,6),
  UNIQUE (item_code, po_no, price_yen)
);
CREATE INDEX IF NOT EXISTS part_impor_item ON part_impor(item_code);
CREATE TABLE IF NOT EXISTS price_master (
  item_code TEXT PRIMARY KEY, price_cls TEXT, trade_code TEXT, trade_name TEXT, priority_cls TEXT,
  currency_code TEXT, price NUMERIC(24,4), unit_cls TEXT, start_date DATE, end_date DATE, last_update TEXT
);
CREATE TABLE IF NOT EXISTS supplier_override (
  period CHAR(7) NOT NULL, item_code TEXT NOT NULL, supplier TEXT NOT NULL, PRIMARY KEY (period, item_code)
);
`;

let ready: Promise<void> | null = null;
function ensureSchema() {
  if (!ready) ready = pool.query(SCHEMA).then(() => undefined).catch((e) => { ready = null; throw e; });
  return ready;
}

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  return (await pool.query(sql, params)).rows as T[];
}

/** Multi-row INSERT; nama tabel/kolom berasal dari konstanta server (aman). */
export async function bulkInsert(table: string, cols: string[], rows: any[][], suffix = ''): Promise<number> {
  await ensureSchema();
  const per = Math.max(1, Math.floor(60000 / cols.length));
  let n = 0;
  for (let i = 0; i < rows.length; i += per) {
    const params: any[] = [];
    const values = rows.slice(i, i + per)
      .map((r) => '(' + r.map((v) => { params.push(v); return '$' + params.length; }).join(',') + ')').join(',');
    const res = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${suffix}`, params);
    n += res.rowCount ?? 0;
  }
  return n;
}
