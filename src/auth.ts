
// src/auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { verifyLogin } from '@/lib/passwords';
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
        const parsed = z
          .object({ email: z.string().email(), password: z.string() })
          .safeParse(credentials);

        if (!parsed.success) return null;

        return verifyLogin(parsed.data.email, parsed.data.password);
      },
    }),
  ],
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
