import * as XLSX from 'xlsx';
import { Spec, norm, convert, rowOk } from './importSpec';

export type ParseResult = {
  sheet: string; headerRow: number;
  mapping: { key: string; label: string; header: string | null; required: boolean }[];
  rows: Record<string, any>[]; missing: string[]; skipped: number;
};

function detectHeader(aoa: any[][], spec: Spec) {
  let best = { row: -1, score: -1, cols: {} as Record<string, number> };
  for (let r = 0; r < Math.min(aoa.length, 60); r++) {
    const row = aoa[r] || [];
    const used = new Set<number>(); const cols: Record<string, number> = {}; let score = 0;
    for (const fld of spec.fields) {
      const idx = row.findIndex((c, i) => !used.has(i) && fld.aliases.includes(norm(c)));
      if (idx >= 0) { used.add(idx); cols[fld.key] = idx; score++; }
    }
    if (score > best.score) best = { row: r, score, cols };
  }
  return best;
}

export async function parseBuffer(buf: ArrayBuffer, spec: Spec, onStatus: (s: string) => void = () => {}): Promise<ParseResult> {
  const names = XLSX.read(buf, { type: 'array', bookSheets: true }).SheetNames as string[];
  let sheet: string | null = null;
  if (names.length === 1) sheet = names[0];
  for (const h of spec.sheetHints) { if (sheet) break; sheet = names.find((n) => norm(n).includes(h)) ?? null; }
  if (!sheet) { // tidak ada nama cocok: nilai tiap sheet dari judul kolomnya
    let top = -1;
    for (const n of names) {
      const wb = XLSX.read(buf, { type: 'array', sheets: n, sheetRows: 60 });
      const aoa = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[n], { header: 1, raw: true, defval: null });
      const s = detectHeader(aoa, spec).score; if (s > top) { top = s; sheet = n; }
    }
  }
  onStatus(`Membaca sheet "${sheet}"…`);
  await new Promise((r) => setTimeout(r, 30));
  const wb = XLSX.read(buf, { type: 'array', sheets: sheet!, dense: true });
  const aoa = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheet!], { header: 1, raw: true, defval: null, blankrows: false });
  const hd = detectHeader(aoa, spec);
  const missing = spec.fields.filter((x) => x.required && hd.cols[x.key] == null).map((x) => x.label);
  const mapping = spec.fields.map((x) => ({
    key: x.key, label: x.label, required: !!x.required,
    header: hd.cols[x.key] != null ? String(aoa[hd.row][hd.cols[x.key]]).trim() : null,
  }));
  const rows: Record<string, any>[] = []; let skipped = 0;
  if (!missing.length) {
    onStatus('Memproses baris…');
    await new Promise((r) => setTimeout(r, 30));
    for (let i = hd.row + 1; i < aoa.length; i++) {
      const src = aoa[i]; if (!src) continue;
      const o: Record<string, any> = {};
      for (const fld of spec.fields) o[fld.key] = hd.cols[fld.key] != null ? convert(fld.type, src[hd.cols[fld.key]]) : null;
      if (rowOk(spec.type, o)) rows.push(o); else skipped++;
    }
  }
  let out = rows;
  if (spec.type === 'price_master') { // simpan hanya Start_Date terbaru per Item_Code
    const m = new Map<string, Record<string, any>>();
    for (const r of rows) {
      const p = m.get(r.item_code);
      if (!p || r.start_date > p.start_date || (r.start_date === p.start_date && (r.last_update || '') > (p.last_update || ''))) m.set(r.item_code, r);
    }
    out = [...m.values()];
  }
  return { sheet: sheet!, headerRow: hd.row + 1, mapping, rows: out, missing, skipped };
}
