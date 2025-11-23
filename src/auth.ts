
// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './firebase/config';
import bcrypt from 'bcrypt';

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

            // NOTE: Pour que cela fonctionne, vous devez stocker un hash du mot de passe dans Firestore.
            // Le mot de passe 'password123' a été hashé et est utilisé ici pour la démo.
            // Le hash correspond à 'password123' : $2a$10$3s/gU6.ExyvNyREU5GjP/.S5sP7t5gWJ7GZa1UqfspgU7Sg5OqVpS
            const passwordHash = userData.passwordHash || '$2a$10$3s/gU6.ExyvNyREU5GjP/.S5sP7t5gWJ7GZa1UqfspgU7Sg5OqVpS';

            const isPasswordValid = await bcrypt.compare(credentials.password as string, passwordHash);

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
  
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  
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
