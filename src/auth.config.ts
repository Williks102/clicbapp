
// src/auth.config.ts
// Configuration NextAuth pour le middleware (Edge Runtime compatible)
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  secret: process.env.AUTH_SECRET,

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        // @ts-ignore
        token.role = user.role; // Ajout du rôle au token
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        // @ts-ignore
        session.user.role = token.role as string; // Ajout du rôle à la session
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
