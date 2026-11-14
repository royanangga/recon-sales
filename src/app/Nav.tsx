'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Dashboard', icon: <><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></> },
  { href: '/detail', label: 'Detail SL AR', icon: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h5" /></> },
  { href: '/part-impor', label: 'Part Impor', icon: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.3" /></> },
  { href: '/import', label: 'Import File', icon: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></> },
];

export default function Nav() {
  const p = usePathname();
  return (
    <nav aria-label="Menu utama">
      {ITEMS.map((i) => {
        const on = i.href === '/' ? p === '/' : p.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={on ? 'on' : ''} data-tip={i.label} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{i.icon}</svg><span className="sr">{i.label}</span>
          </Link>);
      })}
    </nav>
  );
}
