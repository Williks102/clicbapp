// src/auth.ts
import NextAuth, { type NextAuthConfig, CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { verifyLogin } from '@/lib/passwords';
import { clearRateLimit, clientIp, consumeRateLimit, LIMITS } from '@/lib/rate-limit';
import { authConfig as baseAuthConfig } from '@/auth.config';

// Force this file and its dependencies to run in the Node.js environment
export const runtime = 'nodejs';

/**
 * Trop de tentatives sur cette IP ou ce compte.
 *
 * Le `code` remonte jusqu'au client, qui peut afficher un message distinct de
 * « identifiants incorrects ». Il ne divulgue rien : savoir qu'on est limité
 * n'apprend pas si le compte existe.
 */
class TooManyAttempts extends CredentialsSignin {
  code = 'rate_limited';
}

// Extend the base configuration with providers that require Node.js
const authConfig = {
  ...baseAuthConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string() })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        /*
         * La limitation vit ici et non dans la page de connexion : le point
         * d'entrée NextAuth est public, un attaquant l'appelle directement
         * sans jamais charger notre interface.
         *
         * Deux compteurs complémentaires : l'IP borne le balayage de plusieurs
         * comptes, l'e-mail borne l'essai de mots de passe sur un compte
         * précis — un attaquant distribué contourne le premier, pas le second.
         */
        const ipKey = `login:ip:${clientIp(request.headers)}`;
        const emailKey = `login:email:${email.toLowerCase()}`;

        const [byIp, byEmail] = await Promise.all([
          consumeRateLimit(ipKey, LIMITS.loginByIp),
          consumeRateLimit(emailKey, LIMITS.loginByEmail),
        ]);

        if (!byIp.allowed || !byEmail.allowed) {
          console.warn(`[AUTH] ⛔ Tentatives trop nombreuses (${ipKey}).`);
          throw new TooManyAttempts();
        }

        const user = await verifyLogin(email, password);

        if (user) {
          // Une réussite lève la pénalité : se tromper de mot de passe puis
          // finir par le retrouver ne doit pas verrouiller un compte légitime.
          await Promise.all([clearRateLimit(ipKey), clearRateLimit(emailKey)]);
        }

        return user;
      },
    }),
  ],
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
