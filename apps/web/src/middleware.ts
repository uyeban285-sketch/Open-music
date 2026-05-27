import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
