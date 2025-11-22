// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase/config';

// Correction : Initialiser une instance Firebase distincte pour l'authentification côté serveur
// pour éviter d'utiliser l'instance côté client.
const authApp = getApps().find(app => app.name === 'auth-server') || initializeApp(firebaseConfig, 'auth-server');
const firebaseAuth = getAuth(authApp);


export const { handlers, signIn, signOut, auth } = NextAuth({
  // Configuration de session
  session: {
    strategy: 'jwt',
  },
  
  // Secret pour JWT
  secret: process.env.AUTH_SECRET,
  
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          console.error('Missing email or password');
          return null;
        }

        try {
          const userCredential = await signInWithEmailAndPassword(
            firebaseAuth,
            credentials.email as string,
            credentials.password as string
          );

          if (userCredential.user) {
            // L'objet retourné ici sera la propriété 'user' dans le callback 'jwt'
            return {
              id: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName,
            };
          }
          return null;
        } catch (error) {
          console.error('Firebase auth error:', error);
          // Retourner null pour indiquer un échec d'authentification
          return null;
        }
      },
    }),
  ],
  
  pages: {
    signIn: '/login',
    error: '/login', // Rediriger vers la page de connexion en cas d'erreur
  },
  
  callbacks: {
    // Le token JWT est créé avec les informations de 'authorize'
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    // La session client est créée à partir du token JWT
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  
  debug: process.env.NODE_ENV === 'development', // Active les logs en développement
});
