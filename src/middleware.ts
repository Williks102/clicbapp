
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { pathname } = req.nextUrl;
  
  const isAuthenticated = !!token;
  // @ts-ignore
  const userRole = token?.role as string | undefined;

  // If the user is not logged in, redirect to the login page
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated, handle role-based access
  if (isAuthenticated) {
    // Admins can access anything
    if (userRole === 'admin') {
      return NextResponse.next();
    }

    // If trying to access admin pages without admin role, redirect
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/account', req.url));
    }
    
    // If a customer tries to access organizer dashboard, redirect
    if (pathname.startsWith('/dashboard') && userRole === 'customer') {
      return NextResponse.redirect(new URL('/account', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/account/:path*'],
};
