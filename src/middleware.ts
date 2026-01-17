import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isAuthenticated = !!token;
  // @ts-ignore
  const role = token?.role as string | undefined;
  const { pathname } = req.nextUrl;

  const isProtectedRoute = ['/admin', '/dashboard', '/account'].some((p) =>
    pathname.startsWith(p)
  );

  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith('/admin') && role !== 'admin') {
      // Redirect non-admins from /admin
      return NextResponse.redirect(new URL('/account', req.url));
    }

    if (pathname.startsWith('/dashboard') && role === 'customer') {
      // Redirect customers from /dashboard to their account page
      return NextResponse.redirect(new URL('/account', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/account/:path*',
  ],
};
