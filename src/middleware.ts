import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

// Initialize NextAuth with the Edge-compatible config
const { auth } = NextAuth(authConfig);

// Export the middleware function
export default auth((req) => {
  const { auth } = req;
  const isAuthenticated = !!auth;
  // @ts-ignore - 'role' is added in the JWT callback
  const userRole = auth?.user?.role as string | undefined;
  const { pathname } = req.nextUrl;

  // If the user is not logged in and trying to access a protected route, redirect to login
  if (!isAuthenticated) {
    // This check is implicit in the matcher, but we keep it for clarity
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Role-based access control ---

  // Admin pages protection
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    // Redirect non-admins trying to access admin pages
    return NextResponse.redirect(new URL('/account', req.url));
  }

  // Organizer dashboard protection
  if (pathname.startsWith('/dashboard') && userRole === 'customer') {
    // Redirect customers trying to access organizer dashboard
    return NextResponse.redirect(new URL('/account', req.url));
  }

  // Allow the request to proceed if none of the above conditions are met
  return;
});

// The matcher configuration remains crucial
export const config = {
  matcher: [
    // Apply middleware to these protected routes
    '/dashboard/:path*',
    '/admin/:path*',
    '/account/:path*',
  ],
};
