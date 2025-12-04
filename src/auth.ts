
// src/auth.ts
export const runtime = 'nodejs'; // Force l'exécution dans l'environnement Node.js

import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { validateCredentials } from '@/app/actions/auth-actions';

export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  
  secret: process.env.AUTH_SECRET,
  
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
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  trustHost: true,
  
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

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
