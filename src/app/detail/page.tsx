'use client';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/format';
import { usePeriod, PeriodSelect } from '../usePeriod';

export default function Detail() {
  const { periods, period, setPeriod } = usePeriod();
  const [d, setD] = useState<any>(null); const [inh, setInh] = useState<any[]>([]);
  const [tab, setTab] = useState<'sl' | 'inhouse'>('sl'); const [grp, setGrp] = useState(''); const [s, setS] = useState(''); const [flag, setFlag] = useState('');
  const load = () => { if (!period) return; fetch('/api/recon?period=' + period).then((r) => r.json()).then(setD); fetch('/api/inhouse?period=' + period).then((r) => r.json()).then(setInh); };
  useEffect(load, [period]);
  const rows = useMemo(() => (d?.lines || []).filter((l: any) =>
    (!grp || l.group === grp) && (!flag || (flag === 'amb' ? l.ambiguous : flag === 'rate' ? l.rateMissing : l.group === 'UNMATCHED')) &&
    (!s || [l.invoice_no, l.customer, l.item_code, l.item_name, l.customer_dn_no].join(' ').toLowerCase().includes(s.toLowerCase()))).slice(0, 1500), [d, grp, s, flag]);
  async function setSup(base: string, supplier: string) {
    await fetch('/api/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, item_code: base, supplier: supplier || null }) }); load();
  }
  return (<>
    <div className="row" style={{ marginBottom: 14 }}><h1 className="grow" style={{ margin: 0 }}>Detail</h1><PeriodSelect periods={periods} period={period} setPeriod={setPeriod} /></div>
    <div className="row" style={{ marginBottom: 12 }}>
      <button className={tab === 'sl' ? 'pri' : ''} onClick={() => setTab('sl')}>SL AR + harga beli</button>
      <button className={tab === 'inhouse' ? 'pri' : ''} onClick={() => setTab('inhouse')}>PO Inhouse (dipisahkan) — {inh.length}</button>
    </div>
    {tab === 'sl' && <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <input placeholder="Cari invoice / customer / item…" value={s} onChange={(e) => setS(e.target.value)} style={{ minWidth: 260 }} />
        <select value={grp} onChange={(e) => setGrp(e.target.value)}><option value="">Semua kelompok</option><option>HANWA/USC</option><option>IMPOR</option><option>OTHER</option><option>UNMATCHED</option></select>
        <select value={flag} onChange={(e) => setFlag(e.target.value)}><option value="">Semua baris</option><option value="amb">Ada di HANWA &amp; USC</option><option value="rate">Rate impor kosong</option><option value="un">Tidak ditemukan</option></select>
        <span className="mute">{rows.length} baris</span>
      </div>
      <div className="scroll"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Item</th><th className="n">Qty</th><th className="n">Harga jual</th><th className="n">DPP</th><th>Kelompok</th><th>Sumber harga</th><th className="n">Harga beli</th><th className="n">Purchase</th><th className="n">Var harga</th></tr></thead>
        <tbody>{rows.map((l: any) => <tr key={l.id}>
          <td>{l.invoice_no}</td><td>{String(l.customer || '').slice(0, 28)}</td><td title={l.item_name}>{l.item_code}</td>
          <td className="n">{fmt(l.qty)}</td><td className="n">{fmt(l.price)}</td><td className="n">{fmt(l.dpp)}</td>
          <td><span className="tag">{l.group}</span></td>
          <td>{l.ambiguous ? <select value={l.overridden ? l.supplier : ''} onChange={(e) => setSup(l.base_code, e.target.value)}>
            <option value="">Auto ({l.supplier})</option><option>HANWA</option><option>USC</option></select> : l.source}
            {l.rateMissing && <span className="bad"> rate kosong</span>}</td>
          <td className="n">{fmt(l.buy_price)}</td><td className="n">{fmt(l.purchase)}</td><td className={'n ' + (l.price_var < 0 ? 'bad' : '')}>{fmt(l.price_var)}</td></tr>)}</tbody></table></div>
    </div>}
    {tab === 'inhouse' && <div className="card"><p className="mute">Remarks mengandung "inhouse" — dipakai sendiri, tidak ada sales, tidak masuk rekonsiliasi.</p>
      <div className="scroll"><table><thead><tr><th>Supplier</th><th>S.J. No.</th><th>Tgl Terima</th><th>Product Code</th><th className="n">Qty</th><th className="n">Harga</th><th className="n">Rec Amount</th><th>Remarks</th></tr></thead>
        <tbody>{inh.map((r, i) => <tr key={i}><td>{String(r.supp_name).slice(0, 22)}</td><td>{r.sj_no}</td><td>{r.receipt_date}</td><td>{r.product_code}</td><td className="n">{fmt(r.receipt_qty)}</td><td className="n">{fmt(r.receipt_price)}</td><td className="n">{fmt(r.rec_amount)}</td><td>{r.remarks}</td></tr>)}</tbody></table></div></div>}
  </>);
}
