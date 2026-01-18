
'use server';

import { auth } from '@/auth';
import { firestore, firebaseAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Organizer } from '@/lib/types';

// ==================== SCHÉMAS DE VALIDATION ====================

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  bio: z.string().max(500, 'La biographie est trop longue.').optional(),
  avatar: z.string().optional(),
});


const updateEmailSchema = z.object({
  newEmail: z.string().email('Email invalide'),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const updateNotificationPrefsSchema = z.object({
  emailNotifications: z.boolean(),
  platformUpdates: z.boolean(),
});

// ==================== TYPES ====================

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type UpdateEmailData = z.infer<typeof updateEmailSchema>;
export type UpdatePasswordData = z.infer<typeof updatePasswordSchema>;
export type UpdateNotificationPrefsData = z.infer<typeof updateNotificationPrefsSchema>;

export type ActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

// ==================== ACTIONS ====================

/**
 * Met à jour le profil utilisateur (nom, bio, avatar)
 */
export async function updateUserProfile(data: UpdateProfileData): Promise<ActionResult> {
  try {
    console.log('[UPDATE PROFILE] 📝 Starting...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Valider les données
    const validatedData = updateProfileSchema.parse(data);

    // Mettre à jour dans Firestore
    const userRef = firestore.collection('users').doc(session.user.id);
    await userRef.update({
      name: validatedData.name,
    });

    // Si c'est un organisateur, mettre à jour aussi le profil public
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data()?.role === 'organizer') {
      const updates: Partial<Organizer> = { name: validatedData.name };
      if (validatedData.bio !== undefined) updates.bio = validatedData.bio;
      if (validatedData.avatar) updates.avatar = validatedData.avatar;
      
      await firestore.collection('organizers').doc(session.user.id).update(updates);
    }

    // Mettre à jour Firebase Auth
    await firebaseAuth.updateUser(session.user.id, {
      displayName: validatedData.name,
    });

    console.log('[UPDATE PROFILE] ✅ Success');
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/profile');
    revalidatePath('/account/profile');
    revalidatePath(`/organizers/${session.user.id}`);
    
    return { 
      success: true, 
      message: 'Profil mis à jour avec succès' 
    };

  } catch (error: any) {
    console.error('[UPDATE PROFILE] ❌ Error:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return { 
      success: false, 
      error: 'Une erreur est survenue lors de la mise à jour du profil' 
    };
  }
}

/**
 * Met à jour l'email de l'utilisateur
 */
export async function updateUserEmail(data: UpdateEmailData): Promise<ActionResult> {
  try {
    console.log('[UPDATE EMAIL] 📧 Starting...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Valider les données
    const validatedData = updateEmailSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUserQuery = await firestore.collection('users')
      .where('email', '==', validatedData.newEmail)
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      return { 
        success: false, 
        error: 'Cet email est déjà utilisé par un autre compte' 
      };
    }

    // Mettre à jour Firebase Auth
    await firebaseAuth.updateUser(session.user.id, {
      email: validatedData.newEmail,
      emailVerified: false, // L'utilisateur devra re-vérifier son email
    });

    // Mettre à jour Firestore
    await firestore.collection('users').doc(session.user.id).update({
      email: validatedData.newEmail,
    });

    console.log('[UPDATE EMAIL] ✅ Success');
    revalidatePath('/dashboard/settings');
    
    return { 
      success: true, 
      message: 'Email mis à jour avec succès. Veuillez vérifier votre nouvelle adresse email.' 
    };

  } catch (error: any) {
    console.error('[UPDATE EMAIL] ❌ Error:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    if (error.code === 'auth/email-already-exists') {
      return { 
        success: false, 
        error: 'Cet email est déjà utilisé par un autre compte' 
      };
    }
    
    return { 
      success: false, 
      error: 'Une erreur est survenue lors de la mise à jour de l\'email' 
    };
  }
}

/**
 * Met à jour le mot de passe de l'utilisateur
 * Note: La vérification du mot de passe actuel doit être faite côté client
 * car Firebase Admin SDK ne peut pas vérifier les mots de passe
 */
export async function updateUserPassword(data: UpdatePasswordData): Promise<ActionResult> {
  try {
    console.log('[UPDATE PASSWORD] 🔐 Starting...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Valider les données
    const validatedData = updatePasswordSchema.parse(data);

    // Mettre à jour le mot de passe dans Firebase Auth
    await firebaseAuth.updateUser(session.user.id, {
      password: validatedData.newPassword,
    });

    console.log('[UPDATE PASSWORD] ✅ Success');
    
    return { 
      success: true, 
      message: 'Mot de passe mis à jour avec succès' 
    };

  } catch (error: any) {
    console.error('[UPDATE PASSWORD] ❌ Error:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return { 
      success: false, 
      error: 'Une erreur est survenue lors de la mise à jour du mot de passe' 
    };
  }
}

/**
 * Met à jour les préférences de notification
 */
export async function updateNotificationPreferences(
  data: UpdateNotificationPrefsData
): Promise<ActionResult> {
  try {
    console.log('[UPDATE NOTIFICATIONS] 🔔 Starting...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Valider les données
    const validatedData = updateNotificationPrefsSchema.parse(data);

    // Mettre à jour dans Firestore
    await firestore.collection('users').doc(session.user.id).update({
      notificationPreferences: {
        emailNotifications: validatedData.emailNotifications,
        platformUpdates: validatedData.platformUpdates,
      },
    });

    console.log('[UPDATE NOTIFICATIONS] ✅ Success');
    revalidatePath('/dashboard/settings');
    
    return { 
      success: true, 
      message: 'Préférences de notification mises à jour avec succès' 
    };

  } catch (error: any) {
    console.error('[UPDATE NOTIFICATIONS] ❌ Error:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return { 
      success: false, 
      error: 'Une erreur est survenue lors de la mise à jour des préférences' 
    };
  }
}

/**
 * Supprime le compte utilisateur (soft delete)
 */
export async function deleteUserAccount(): Promise<ActionResult> {
  try {
    console.log('[DELETE ACCOUNT] 🗑️ Starting...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Marquer le compte comme supprimé dans Firestore
    await firestore.collection('users').doc(session.user.id).update({
      deleted: true,
      deletedAt: new Date().toISOString(),
    });

    // Désactiver le compte dans Firebase Auth
    await firebaseAuth.updateUser(session.user.id, {
      disabled: true,
    });

    console.log('[DELETE ACCOUNT] ✅ Success');
    
    return { 
      success: true, 
      message: 'Compte supprimé avec succès' 
    };

  } catch (error: any) {
    console.error('[DELETE ACCOUNT] ❌ Error:', error);
    
    return { 
      success: false, 
      error: 'Une erreur est survenue lors de la suppression du compte' 
    };
  }
}
