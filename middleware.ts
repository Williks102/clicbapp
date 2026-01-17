import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// This secret is used to sign and verify the JWT.
const getJwtSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'AUTH_SECRET environment variable is not set. Please add it to your .env file.'
    );
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Define protected routes
  const isProtectedRoute = ['/admin', '/dashboard', '/account'].some((p) =>
    pathname.startsWith(p)
  );

  // If the route is not protected, continue without checks.
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Determine the correct cookie name based on the environment
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  const token = req.cookies.get(cookieName)?.value;

  let isAuthenticated = false;
  let role: string | undefined = undefined;

  if (token) {
    try {
      // Manually verify the JWT using 'jose'
      const { payload } = await jwtVerify(token, await getJwtSecret());
      isAuthenticated = !!payload;
      // @ts-ignore - The 'role' property exists on our custom JWT payload
      role = payload.role as string | undefined;
    } catch (err) {
      // Token verification failed (e.g., expired, invalid signature)
      isAuthenticated = false;
    }
  }

  // --- Start of Protection Logic ---

  // If on a protected route and not authenticated, redirect to login.
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Role-based access control ---

  // If trying to access /admin but not an admin, redirect.
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', req.url));
  }

  // If a 'customer' tries to access /dashboard, redirect to their account page.
  if (pathname.startsWith('/dashboard') && role === 'customer') {
    return NextResponse.redirect(new URL('/account', req.url));
  }
  
  // If all checks pass, allow the request to proceed.
  return NextResponse.next();
}

// The matcher defines which routes the middleware will run on.
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/account/:path*'],
};
