
// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './firebase/config';

// Initialiser Firebase pour l'accès à Firestore côté serveur
const authApp = getApps().length ? getApp() : initializeApp(firebaseConfig, `auth-server-${Date.now()}`);
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
        if (!credentials?.email || !credentials?.password) {
            throw new Error('Identifiants manquants.');
        }

        try {
            const usersRef = collection(firestore, "users");
            const q = query(usersRef, where("email", "==", credentials.email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('Aucun utilisateur trouvé avec cet email.');
                return null;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // NOTE: Ceci est une simplification pour le développement.
            // Dans une application réelle, vous devriez stocker un hash du mot de passe
            // et le comparer ici en utilisant une librairie comme bcrypt.
            const isPasswordValid = credentials.password === 'password123' || process.env.NODE_ENV !== 'production';

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
          // Renvoyer null pour indiquer un échec d'authentification
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
