import { NextRequest, NextResponse } from 'next/server';

// Proteksi sederhana: aktif jika BASIC_AUTH_USER & BASIC_AUTH_PASS diisi di environment variable.
export function middleware(req: NextRequest) {
  const u = process.env.BASIC_AUTH_USER, p = process.env.BASIC_AUTH_PASS;
  if (!u || !p) return NextResponse.next();
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    const [user, ...rest] = atob(h.slice(6)).split(':');
    if (user === u && rest.join(':') === p) return NextResponse.next();
  }
  return new NextResponse('Login diperlukan', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Merch Adjust"' } });
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
