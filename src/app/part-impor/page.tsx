'use client';
import { useCallback, useEffect, useState } from 'react';
import { fmt } from '@/lib/format';

export default function PartImpor() {
  const [d, setD] = useState<any>({ rows: [], total: 0, missing: 0, filtered: 0, size: 200 });
  const [s, setS] = useState(''); const [missing, setMissing] = useState(false); const [page, setPage] = useState(0);
  const [bulkRate, setBulkRate] = useState(''); const [bulkMonth, setBulkMonth] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(() => { fetch(`/api/part-impor?q=${encodeURIComponent(s)}&missing=${missing ? 1 : 0}&page=${page}`).then((r) => r.json()).then(setD); }, [s, missing, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const patch = (b: any) => fetch('/api/part-impor', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  async function saveRate(id: number, v: string) { const j = await patch({ id, rate: v }); if (j.error) setMsg(j.error); load(); }
  async function bulk(all: boolean) {
    if (!bulkRate) return setMsg('Isi rate dulu.'); if (!all && !/^\d{4}-\d{2}$/.test(bulkMonth)) return setMsg('Isi bulan PO Date (YYYY-MM).');
    const j = await patch({ all, month: bulkMonth, rate: bulkRate, onlyEmpty: true }); setMsg(j.error || `${j.updated} baris diperbarui (hanya yang rate-nya kosong).`); load();
  }
  return (<>
    <h1>Part Impor — harga beli kelompok IMPOR</h1>
    <p className="mute">Daftar ini terbentuk otomatis dari import PO Impor (FJJ, harga YEN). Isi kolom <b>Rate</b> manual untuk mengubah ke IDR. Untuk tiap item, harga dengan PO Date terbaru yang dipakai di rekonsiliasi.</p>
    <div className="card">
      <div className="row">
        <b>Isi rate massal</b>
        <input placeholder="Rate (mis. 112.06)" value={bulkRate} onChange={(e) => setBulkRate(e.target.value)} style={{ width: 150 }} />
        <input placeholder="Bulan PO (YYYY-MM)" value={bulkMonth} onChange={(e) => setBulkMonth(e.target.value)} style={{ width: 160 }} />
        <button onClick={() => bulk(false)}>Terapkan ke bulan itu</button><button onClick={() => bulk(true)}>Terapkan ke semua yang kosong</button>
        {msg && <span className="mute">{msg}</span>}
      </div>
    </div>
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <input placeholder="Cari item / deskripsi / PO…" value={s} onChange={(e) => { setPage(0); setS(e.target.value); }} style={{ minWidth: 260 }} />
        <label className="row"><input type="checkbox" checked={missing} onChange={(e) => { setPage(0); setMissing(e.target.checked); }} /> Rate kosong saja ({d.missing})</label>
        <span className="mute grow">{d.filtered} dari {d.total} baris</span>
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button><span className="mute">hal {page + 1}</span>
        <button disabled={(page + 1) * d.size >= d.filtered} onClick={() => setPage(page + 1)}>›</button>
      </div>
      <div className="scroll"><table><thead><tr><th>Item Code</th><th>Description</th><th>PO Date</th><th>PO No</th><th className="n">Price (YEN)</th><th>Rate</th><th className="n">Price IDR</th></tr></thead>
        <tbody>{d.rows.map((r: any) => <tr key={r.id}><td>{r.item_code}</td><td>{String(r.description || '').slice(0, 40)}</td><td>{r.po_date}</td><td>{r.po_no}</td>
          <td className="n">{fmt(r.price_yen)}</td>
          <td><input key={r.id + ':' + r.rate} defaultValue={r.rate ?? ''} placeholder="rate" style={{ width: 90 }} onBlur={(e) => { if (e.target.value !== String(r.rate ?? '')) saveRate(r.id, e.target.value); }} /></td>
          <td className="n">{r.price_idr != null ? fmt(r.price_idr) : <span className="warn">rate belum diisi</span>}</td></tr>)}</tbody></table></div>
    </div>
  </>);
}
