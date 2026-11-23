'use client';
import { useEffect, useState } from 'react';
import { fmt } from '@/lib/format';
import { usePeriod, PeriodSelect } from './usePeriod';

const Num = ({ v }: { v: any }) => <td className={'n ' + (typeof v === 'number' && v < 0 ? 'bad' : '')}>{fmt(v)}</td>;

function Journal({ lines, diff, title }: any) {
  const d = lines.reduce((a: number, l: any) => a + l.debit, 0), c = lines.reduce((a: number, l: any) => a + l.credit, 0);
  return (
    <div className="card"><h2>{title}</h2>
      <div className="tw"><table><thead><tr><th>Akun</th><th>Nama</th><th>Ket.</th><th className="n">Debit</th><th className="n">Kredit</th></tr></thead>
        <tbody>{lines.map((l: any, i: number) => <tr key={i}><td>{l.account}</td><td>{l.name}</td><td className="mute">{l.note}</td><Num v={l.debit} /><Num v={l.credit} /></tr>)}</tbody>
        <tfoot><tr><td colSpan={3}>Total {Math.abs(diff) < 1 ? <span className="ok">✓ balance</span> : <span className="bad">selisih {fmt(diff)}</span>}</td><td className="n">{fmt(d)}</td><td className="n">{fmt(c)}</td></tr></tfoot>
      </table></div></div>
  );
}

export default function Dashboard() {
  const { periods, period, setPeriod } = usePeriod();
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!period) return; setLoading(true); setErr('');
    fetch('/api/recon?period=' + period).then((r) => r.json()).then((j) => { if (j.error) { setErr(j.error); setD(null); } else setD(j); }).catch((e) => setErr(String(e))).finally(() => setLoading(false));
  }, [period]);

  const [exporting, setExporting] = useState(false);
  async function exportXlsx() {
    setExporting(true); setErr('');
    try {
      const r = await fetch('/api/export?period=' + period); const p = await r.json(); if (p.error) throw new Error(p.error);
      const [{ default: ExcelJS }, { buildWorkbook }] = await Promise.all([import('exceljs'), import('@/lib/exportExcel')]);
      const wb = await buildWorkbook(ExcelJS, p); const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = `CEK AR & AP ${period}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { setErr('Export gagal: ' + e.message); } finally { setExporting(false); }
  }

  return (<>
    <div className="row" style={{ marginBottom: 14 }}>
      <h1 className="grow" style={{ margin: 0 }}>Dashboard Adjustment — periode</h1>
      <PeriodSelect periods={periods} period={period} setPeriod={setPeriod} />
      <button onClick={exportXlsx} disabled={!d || exporting}>{exporting ? 'Menyiapkan…' : 'Export Excel (rumus)'}</button>
    </div>
    {loading && <p className="mute">Menghitung…</p>}
    {err && <div className="alert bad">{err}</div>}
    {d && <>
      {d.warnings.map((w: string, i: number) => <div className="alert" key={i}>⚠ {w}</div>)}
      <div className="grid">
        <div className="card"><h2>Rekonsiliasi SL AR vs PO PROGRESS COIL</h2>
          <div className="tw"><table><thead><tr><th>Kelompok</th><th className="n">Sales (DPP)</th><th className="n">Purchase</th><th className="n">Variance</th></tr></thead>
            <tbody>{d.recon.map((r: any) => <tr key={r.group}><td>{r.group}</td><Num v={r.sales} /><Num v={r.purchase} /><Num v={r.variance} /></tr>)}
              {d.unmatched.count > 0 && <tr><td className="warn">TIDAK DITEMUKAN ({d.unmatched.count})</td><Num v={d.unmatched.sales} /><td /><td /></tr>}</tbody>
            <tfoot><tr><td>Total</td><td className="n">{fmt(d.tot.sales)}</td><td className="n">{fmt(d.tot.purchase)}</td><td className="n">{fmt(d.tot.sales - d.tot.purchase)}</td></tr></tfoot></table></div>
          <p className="mute">HANWA/USC = pembelian aktual PO (setelah inhouse dipisahkan). IMPOR/OTHER = Qty × harga beli.</p>
        </div>
        <div className="card"><h2>PO Progress — pemisahan Inhouse</h2>
          <div className="tw"><table><thead><tr><th>Supplier</th><th className="n">Rec Amount</th><th className="n">Inhouse (dipisah)</th><th className="n">Masuk rekonsiliasi</th></tr></thead>
            <tbody>{(['HANWA', 'USC'] as const).map((s) => <tr key={s}><td>{s}</td><Num v={d.po[s].total} /><Num v={d.po[s].inhouse} /><Num v={d.po[s].total - d.po[s].inhouse} /></tr>)}</tbody>
            <tfoot><tr><td colSpan={3}>Net HANWA/USC</td><td className="n">{fmt(d.po.net)}</td></tr></tfoot></table></div>
        </div>
      </div>
      <Journal title="Jurnal Adjustment Purchase Merchandise" lines={d.purchaseJournal.lines} diff={d.purchaseJournal.diff} />
      <div className="grid">
        <div className="card"><h2>Analisis GL SALES (EZR vs SAP)</h2>
          <div className="tw"><table><thead><tr><th>Akun</th><th>Jenis</th><th className="n">EZR Sales</th><th className="n">GL Sales</th><th className="n">D (K)</th></tr></thead>
            <tbody>{d.gls.rows.map((r: any) => <tr key={r.account}><td>{r.account}</td><td>{r.name.replace('Sales Merchandise ', '')}</td><Num v={r.ezr} /><Num v={r.gl} /><Num v={r.diff} /></tr>)}</tbody>
            <tfoot><tr><td colSpan={2}>Total</td><td className="n">{fmt(d.gls.ezrTotal)}</td><td className="n">{fmt(d.gls.glTotal)}</td><td className="n">{fmt(d.gls.rows.reduce((a: number, r: any) => a + r.diff, 0))}</td></tr></tfoot></table></div>
          <p className="mute">Selisih total EZR vs SAP: <b className={Math.abs(d.gls.selisihEzrSap) < 1 ? 'ok' : 'bad'}>{fmt(d.gls.selisihEzrSap) || '0'}</b></p>
        </div>
        <Journal title="Jurnal Adjustment Sales Merchandise" lines={d.salesJournal.lines} diff={d.salesJournal.diff} />
      </div>
      {d.invoiceDiffs.length > 0 && <div className="card"><h2>Invoice dengan akun berbeda antara EZR dan SAP ({d.invoiceDiffs.length})</h2>
        <div className="scroll"><table><thead><tr><th>Invoice</th><th className="n">EZR Local</th><th className="n">SAP Local</th><th className="n">Selisih</th><th className="n">EZR Impor</th><th className="n">SAP Impor</th><th className="n">Selisih</th></tr></thead>
          <tbody>{d.invoiceDiffs.map((x: any) => <tr key={x.invoice_no}><td>{x.invoice_no}</td><Num v={x.ezr_local} /><Num v={x.gl_local} /><Num v={x.diff_local} /><Num v={x.ezr_import} /><Num v={x.gl_import} /><Num v={x.diff_import} /></tr>)}</tbody></table></div></div>}
    </>}
  </>);
}
