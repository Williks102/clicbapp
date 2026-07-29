import { NextResponse } from 'next/server';
import { auth } from '@/auth-edge';

/**
 * Contrôle d'accès aux espaces privés.
 *
 * La session est lue par le wrapper `auth` d'Auth.js : lui seul sait déchiffrer
 * le cookie de session, qui est un JWE (chiffré), et non un simple JWT signé.
 * Toute tentative de le vérifier manuellement échouerait, et le nom du cookie
 * varie selon la version d'Auth.js et le protocole (préfixe `__Secure-` en
 * HTTPS) — deux raisons de ne jamais le lire à la main.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  // L'administration est réservée aux administrateurs.
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', req.nextUrl.origin));
  }

  // Le tableau de bord est réservé aux organisateurs et aux administrateurs.
  if (pathname.startsWith('/dashboard') && role !== 'organizer' && role !== 'admin') {
    return NextResponse.redirect(new URL('/account', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/account/:path*'],
};
