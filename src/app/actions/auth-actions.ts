
'use server';

import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Initialiser Firebase Admin (si pas déjà fait)
if (!admin.apps.length) {
  try {
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
  } catch (error) {
    console.error("Erreur d'initialisation de Firebase Admin dans auth-actions:", error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

// Schéma de validation
const signupSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  role: z.enum(['customer', 'organizer']).default('customer'),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export type SignupResult = {
  success: boolean;
  error?: string;
  userId?: string;
};

export async function createUserAccount(data: SignupFormData): Promise<SignupResult> {
  try {
    console.log('[SIGNUP] 📝 Tentative de création de compte:', data.email);

    // Valider les données
    const validatedData = signupSchema.parse(data);

    // Vérifier si l'email existe déjà dans Firestore
    const existingUserQuery = await db.collection('users')
      .where('email', '==', validatedData.email)
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      console.log('[SIGNUP] ❌ Email déjà utilisé');
      return {
        success: false,
        error: 'Un compte existe déjà avec cet email.',
      };
    }

    // Étape 1 : Créer l'utilisateur dans Firebase Auth
    console.log('[SIGNUP] 🔐 Création dans Firebase Auth...');
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: validatedData.email,
        password: validatedData.password,
        displayName: validatedData.name,
      });
      console.log('[SIGNUP] ✅ Utilisateur créé dans Firebase Auth:', firebaseUser.uid);
    } catch (authError: any) {
      console.error('[SIGNUP] ❌ Erreur Firebase Auth:', authError);
      
      if (authError.code === 'auth/email-already-exists') {
        return {
          success: false,
          error: 'Un compte existe déjà avec cet email.',
        };
      }
      
      return {
        success: false,
        error: 'Erreur lors de la création du compte. Veuillez réessayer.',
      };
    }

    // Étape 2 : Créer le document dans Firestore
    console.log('[SIGNUP] 💾 Création du document Firestore...');
    const userData = {
      id: firebaseUser.uid,
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      createdAt: new Date().toISOString(),
      ...(validatedData.role === 'organizer' ? { bio: '' } : {}),
    };

    await db.collection('users').doc(firebaseUser.uid).set(userData);
    console.log('[SIGNUP] ✅ Document Firestore créé');

    // Étape 3 : Si c'est un organizer, créer aussi dans la collection organizers (pour affichage public)
    if (validatedData.role === 'organizer') {
      console.log('[SIGNUP] 👤 Création du profil organisateur public...');
      await db.collection('organizers').doc(firebaseUser.uid).set({
        id: firebaseUser.uid,
        name: validatedData.name,
        bio: '',
        avatar: 'organizer-1', // Avatar par défaut
      });
      console.log('[SIGNUP] ✅ Profil organisateur créé');
    }

    console.log('[SIGNUP] 🎉 Compte créé avec succès!');
    return {
      success: true,
      userId: firebaseUser.uid,
    };

  } catch (error: any) {
    console.error('[SIGNUP] ❌ Erreur inattendue:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte.',
    };
  }
}

// Action pour vérifier si un email est déjà utilisé (utile pour validation en temps réel)
export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    return usersQuery.empty; // true si disponible, false si déjà utilisé
  } catch (error) {
    console.error('[EMAIL_CHECK] Erreur:', error);
    return false;
  }
}
