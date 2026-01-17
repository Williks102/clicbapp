
// src/auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { validateCredentials } from '@/app/actions/auth-actions';
import { authConfig as baseAuthConfig } from '@/auth.config';

// Force this file and its dependencies to run in the Node.js environment
export const runtime = 'nodejs';

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
      async authorize(credentials) {
        // Appelle la Server Action pour valider les identifiants
        const user = await validateCredentials(credentials);

        if (user) {
          // Retourne l'objet utilisateur si la validation est réussie
          return user;
        } else {
          // Retourne null si la validation échoue
          return null;
        }
      },
    }),
  ],
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
