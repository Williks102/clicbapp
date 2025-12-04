
import NextAuth from 'next-auth';
import { authConfig } from '@/auth';

export default NextAuth(authConfig).auth;

// https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    /*
     * Fait correspondre tous les chemins de requête sauf ceux qui commencent par :
     * - api (chemins API)
     * - _next/static (fichiers statiques)
     * - _next/image (fichiers d'optimisation d'image)
     * - favicon.ico (fichier favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Appliquer la protection spécifiquement aux routes qui en ont besoin
    "/dashboard/:path*", 
    "/admin/:path*", 
    "/account/:path*"
  ],
};
