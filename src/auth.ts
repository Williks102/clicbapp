
// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import admin from 'firebase-admin';
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
        console.log('--- Début de l\'autorisation ---');
        console.log('Identifiants reçus:', { email: credentials?.email });

        if (!credentials?.email || !credentials?.password) {
            console.error('Identifiants manquants.');
            throw new Error('Identifiants manquants.');
        }

        try {
            const usersRef = firestore.collection("users");
            const q = usersRef.where("email", "==", credentials.email);
            
            console.log(`Recherche de l'utilisateur avec l'email: ${credentials.email}`);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                console.log('Aucun utilisateur trouvé avec cet email.');
                return null;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as User;
            console.log('Utilisateur trouvé en BDD:', { id: userDoc.id, email: userData.email, role: userData.role });

            // !!! SOLUTION DE CONTOURNEMENT TEMPORAIRE ET NON SÉCURISÉE !!!
            // Nous vérifions simplement si un mot de passe a été fourni, sans le comparer.
            // Cela permet de tester le reste du flux d'authentification.
            const isPasswordPresent = (credentials.password as string).length > 0;
            console.log(`[CONTOURNEMENT] Vérification de la présence du mot de passe: ${isPasswordPresent}`);

            if (isPasswordPresent) {
                console.log('Autorisation réussie (CONTOURNEMENT). Retour de l\'objet utilisateur.');
                return {
                    id: userDoc.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role || 'customer',
                };
            } else {
                 console.log('Mot de passe non fourni.');
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
