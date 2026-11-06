const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
export const fmt = (n: any) => (n == null || n === '' ? '' : n === 0 ? '-' : nf.format(Number(n)));
export function prevPeriod() { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
