import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

export default NextAuth(authConfig).auth((req) => {
  const { auth } = req;
  const isAuthenticated = !!auth;
  // @ts-ignore
  const userRole = auth?.user?.role as string | undefined;
  const { pathname } = req.nextUrl;

  // The middleware only runs for paths in the matcher.
  // So we can assume we are on a protected route.

  // If the user is not logged in, redirect to the login page
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated, handle role-based access
  // Admins can access anything
  if (userRole === 'admin') {
    return; // Allow request to proceed
  }

  // If trying to access admin pages without admin role, redirect
  if (pathname.startsWith('/admin')) {
    // a non-admin is trying to access an admin page
    return NextResponse.redirect(new URL('/account', req.url));
  }
    
  // If a customer tries to access organizer dashboard, redirect
  if (pathname.startsWith('/dashboard') && userRole === 'customer') {
    return NextResponse.redirect(new URL('/account', req.url));
  }

  // Allow access if none of the above conditions are met
  return;
});

// The matcher configuration remains the same.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/account/:path*'],
};
