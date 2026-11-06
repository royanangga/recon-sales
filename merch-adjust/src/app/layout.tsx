import './globals.css';
import Link from 'next/link';
export const metadata = { title: 'Adjustment Sales & Purchase Merchandise' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id"><body>
      <nav><b>Adjustment Merchandise</b>
        <Link href="/">Dashboard</Link><Link href="/detail">Detail SL AR</Link>
        <Link href="/part-impor">Part Impor</Link><Link href="/import">Import File</Link>
      </nav>
      <main>{children}</main>
    </body></html>
  );
}
