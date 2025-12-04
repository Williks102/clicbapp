
import { auth } from "@/auth";

export default auth((req) => {
  // La logique du middleware peut être ajoutée ici si nécessaire à l'avenir.
  // Pour l'instant, la protection des routes est gérée par la configuration ci-dessous.
});

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

export const runtime = 'nodejs';
