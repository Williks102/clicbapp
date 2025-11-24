// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    console.log('Initialisation de Firebase Admin...');
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('Les variables d\'environnement Firebase Admin ne sont pas toutes définies.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialisé avec succès.');
  } catch (error) {
    console.error('Erreur d\'initialisation de Firebase Admin:', error);
  }
}

const firestore = admin.firestore();

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Identifiants manquants.');
        }

        try {
          const usersRef = firestore.collection("users");
          const q = usersRef.where("email", "==", credentials.email);
          const querySnapshot = await q.get();

          if (querySnapshot.empty) {
            console.log('Aucun utilisateur trouvé avec cet email.');
            return null;
          }

          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data() as User;

          if (!userData.passwordHash) {
            console.log('Utilisateur sans mot de passe haché.');
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            userData.passwordHash
          );

          if (isPasswordValid) {
            return {
              id: userDoc.id,
              email: userData.email,
              name: userData.name,
              role: userData.role || 'customer',
            };
          } else {
            console.log('Mot de passe invalide.');
            return null;
          }
        } catch (error) {
          console.error("Erreur d'autorisation:", error);
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
});
