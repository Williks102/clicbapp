import { auth } from '@/auth-edge';
import { NextResponse } from 'next/server';

export default auth((req) => {
  // @ts-ignore
  const isAuthenticated = !!req.auth;
  // @ts-ignore
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', req.url));
  }

  if (pathname.startsWith('/dashboard') && role === 'customer') {
    return NextResponse.redirect(new URL('/account', req.url));
  }

  return;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/account/:path*"
  ]
};
