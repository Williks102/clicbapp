// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase/config';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialiser Firebase pour l'authentification côté serveur
const authApp = getApps().find(app => app.name === 'auth-server') || 
  initializeApp(firebaseConfig, 'auth-server');
const firebaseAuth = getAuth(authApp);
const firestore = getFirestore(authApp);

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
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }

          const userCredential = await signInWithEmailAndPassword(
            firebaseAuth,
            String(credentials.email),
            String(credentials.password)
          );

          if (userCredential.user) {
            // Récupérer le rôle de l'utilisateur depuis Firestore
            const userDocRef = doc(firestore, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: userCredential.user.uid,
                email: userCredential.user.email,
                name: userCredential.user.displayName,
                role: userData.role || 'customer', // Ajout du rôle
              };
            } else {
                // Si l'utilisateur n'est pas dans la collection 'users', on lui donne un rôle par défaut
                return {
                    id: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: userCredential.user.displayName,
                    role: 'customer'
                }
            }
          }
          
          return null;
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      },
    }),
  ],
  
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
});
```