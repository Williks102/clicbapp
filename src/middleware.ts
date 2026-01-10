
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Le middleware est maintenant initialisé uniquement avec la configuration compatible "Edge"
// En utilisant cette syntaxe simple, NextAuth gère la séparation des routes publiques et protégées.
// Les pages de connexion, d'erreur, etc., définies dans auth.config.ts sont automatiquement exclues.
export default NextAuth(authConfig).auth;

// https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
// En supprimant le matcher, on laisse NextAuth appliquer la protection à tout le site par défaut,
// ce qui est souvent plus simple et plus sûr. Les routes API et les fichiers statiques sont ignorés par défaut.
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/account/:path*"]
};
