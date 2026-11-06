'use client';
import { useState } from 'react';
import { SPECS, ImportType } from '@/lib/importSpec';
import { parseBuffer, ParseResult } from '@/lib/parseWorkbook';
import { prevPeriod } from '@/lib/format';

const ORDER: ImportType[] = ['sl_ar', 'gl_sales', 'po_progress', 'po_impor', 'price_master'];

function Card({ type, period }: { type: ImportType; period: string }) {
  const spec = SPECS[type];
  const [buf, setBuf] = useState<ArrayBuffer | null>(null); const [res, setRes] = useState<ParseResult | null>(null);
  const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  const needPeriod = spec.mode === 'replace-period';

  async function pick(file?: File) {
    if (!file) return; setRes(null); setDone(''); setBusy(true);
    try { setStatus('Membuka file…'); const b = await file.arrayBuffer(); setBuf(b); const r = await parseBuffer(b, spec, setStatus); setRes(r); setStatus(''); }
    catch (e: any) { setStatus('Gagal membaca file: ' + e.message); } finally { setBusy(false); }
  }
  async function send() {
    if (!res) return; setBusy(true); setDone('');
    const post = (body: any) => fetch(`/api/import/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, ...body }) }).then((r) => r.json());
    try {
      let j = await post({ action: 'reset' }); if (j.error) throw new Error(j.error);
      const size = 1500; let ins = 0, extra = 0;
      for (let i = 0; i < res.rows.length; i += size) {
        setStatus(`Mengirim ${Math.min(i + size, res.rows.length)} / ${res.rows.length}…`);
        j = await post({ action: 'append', rows: res.rows.slice(i, i + size) }); if (j.error) throw new Error(j.error); ins += j.inserted; extra += j.extra || 0;
      }
      setStatus(''); setDone(`✓ ${ins} baris tersimpan${type === 'po_impor' ? ` (${res.rows.length - ins} sudah ada, ${extra} harga baru masuk Part Impor)` : ''}.`);
    } catch (e: any) { setStatus('Gagal: ' + e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card"><h2>{spec.title} <span className="tag">{spec.mode === 'append' ? 'tambah saja' : spec.mode === 'replace-all' ? 'ganti semua' : 'ganti per periode'}</span></h2>
      <p className="mute">{spec.desc}</p>
      <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
      {status && <p className="mute">{status}</p>}
      {res && <div style={{ marginTop: 10 }}>
        <p>Sheet <b>{res.sheet}</b>, judul di baris <b>{res.headerRow}</b> — <b>{res.rows.length}</b> baris valid{res.skipped ? `, ${res.skipped} dilewati (subtotal/judul seksi)` : ''}.</p>
        {res.missing.length > 0 ? <div className="alert bad">Kolom wajib tidak ditemukan: {res.missing.join(', ')}</div> :
          <details><summary className="mute">Pemetaan kolom</summary><div className="mute">{res.mapping.map((m) => <span key={m.key} style={{ marginRight: 12 }}>{m.label} → {m.header ?? <i>(tidak ada)</i>}</span>)}</div></details>}
        <button className="pri" style={{ marginTop: 10 }} disabled={busy || res.missing.length > 0 || (needPeriod && !period)} onClick={send}>
          Import{needPeriod ? ` ke periode ${period}` : ''}</button>
      </div>}
      {done && <p className="ok">{done}</p>}
    </div>
  );
}

export default function ImportPage() {
  const [period, setPeriod] = useState(prevPeriod());
  return (<>
    <div className="row" style={{ marginBottom: 14 }}><h1 className="grow" style={{ margin: 0 }}>Import File</h1>
      <label>Periode report <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label></div>
    <p className="mute">Boleh upload workbook lengkap — sheet dipilih otomatis dari nama sheet, kolom dikenali dari nama judul meski posisinya bergeser. File dibaca di browser Anda; hanya data yang diperlukan dikirim ke database.</p>
    {ORDER.map((t) => <Card key={t} type={t} period={period} />)}
  </>);
}
