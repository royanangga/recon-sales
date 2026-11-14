import './globals.css';
import Nav from './Nav';
export const metadata = { title: 'Adjustment Sales & Purchase Merchandise' };
export const viewport = { themeColor: '#6a5ae0', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id"><body>
      <div className="shell">
        <aside><b className="logo" role="img" aria-label="Adjustment Merchandise">AM</b><Nav /></aside>
        <header className="topbar"><b className="tb-logo">Adjustment Merchandise</b></header>
        <main>{children}</main>
      </div>
    </body></html>
  );
}
