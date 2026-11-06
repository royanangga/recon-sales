'use client';
import { useEffect, useState } from 'react';
import { prevPeriod } from '@/lib/format';
export function usePeriod() {
  const [periods, setPeriods] = useState<string[]>([]); const [period, setPeriod] = useState('');
  useEffect(() => { fetch('/api/periods').then((r) => r.json()).then((p: string[]) => { setPeriods(p); setPeriod(p[0] || prevPeriod()); }).catch(() => setPeriod(prevPeriod())); }, []);
  return { periods, period, setPeriod };
}
export function PeriodSelect({ periods, period, setPeriod }: any) {
  const list = periods.includes(period) || !period ? periods : [period, ...periods];
  return <select value={period} onChange={(e) => setPeriod(e.target.value)}>{list.map((p: string) => <option key={p}>{p}</option>)}</select>;
}
