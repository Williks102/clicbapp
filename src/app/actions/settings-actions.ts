'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { hashPassword, verifyCurrentPassword } from '@/app/actions/auth-actions';
import type { UserRow } from '@/lib/supabase/types';

// ==================== SCHÉMAS ====================

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  bio: z.string().max(500, 'La biographie est trop longue.').optional(),
  avatar: z.string().optional(),
});

const updateEmailSchema = z.object({
  newEmail: z.string().email('Email invalide'),
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z
      .string()
      .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
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

/** Met à jour le profil (nom, biographie, avatar). */
export async function updateUserProfile(data: UpdateProfileData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const validated = updateProfileSchema.parse(data);
    const supabase = getSupabaseAdmin();

    const { data: updated, error } = await supabase
      .from('users')
      .update({
        name: validated.name,
        ...(validated.bio !== undefined ? { bio: validated.bio } : {}),
        ...(validated.avatar ? { avatar: validated.avatar } : {}),
      })
      .eq('id', session.user.id)
      .select('role')
      .single();

    if (error) throw new Error(error.message);

    // Le profil public de l'organisateur suit le profil du compte.
    if ((updated as Pick<UserRow, 'role'>).role === 'organizer') {
      const { error: organizerError } = await supabase
        .from('organizers')
        .update({
          name: validated.name,
          ...(validated.bio !== undefined ? { bio: validated.bio } : {}),
          ...(validated.avatar ? { avatar: validated.avatar } : {}),
        })
        .eq('id', session.user.id);

      if (organizerError) {
        console.error('[UPDATE PROFILE] ⚠️ Profil public non mis à jour :', organizerError.message);
      }
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/profile');
    revalidatePath('/account/profile');
    revalidatePath(`/organizers/${session.user.id}`);

    return { success: true, message: 'Profil mis à jour avec succès' };
  } catch (error) {
    console.error('[UPDATE PROFILE] ❌', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour du profil',
    };
  }
}

/** Change l'adresse e-mail du compte. */
export async function updateUserEmail(data: UpdateEmailData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const validated = updateEmailSchema.parse(data);

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ email: validated.newEmail })
      .eq('id', session.user.id);

    if (error) {
      // 23505 : l'adresse est déjà rattachée à un autre compte.
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Cet email est déjà utilisé par un autre compte',
        };
      }
      throw new Error(error.message);
    }

    revalidatePath('/dashboard/settings');
    return {
      success: true,
      message:
        'Email mis à jour avec succès. Reconnectez-vous avec votre nouvelle adresse.',
    };
  } catch (error) {
    console.error('[UPDATE EMAIL] ❌', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: "Une erreur est survenue lors de la mise à jour de l'email",
    };
  }
}

/**
 * Change le mot de passe.
 * Le mot de passe actuel est réellement vérifié côté serveur, ce que
 * l'implémentation précédente ne permettait pas.
 */
export async function updateUserPassword(data: UpdatePasswordData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const validated = updatePasswordSchema.parse(data);

    const isCurrentPasswordValid = await verifyCurrentPassword(
      session.user.id,
      validated.currentPassword
    );

    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Le mot de passe actuel est incorrect' };
    }

    const passwordHash = await hashPassword(validated.newPassword);

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', session.user.id);

    if (error) throw new Error(error.message);

    return { success: true, message: 'Mot de passe mis à jour avec succès' };
  } catch (error) {
    console.error('[UPDATE PASSWORD] ❌', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour du mot de passe',
    };
  }
}

export async function updateNotificationPreferences(
  data: UpdateNotificationPrefsData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const validated = updateNotificationPrefsSchema.parse(data);

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({
        notification_preferences: {
          emailNotifications: validated.emailNotifications,
          platformUpdates: validated.platformUpdates,
        },
      })
      .eq('id', session.user.id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return {
      success: true,
      message: 'Préférences de notification mises à jour avec succès',
    };
  } catch (error) {
    console.error('[UPDATE NOTIFICATIONS] ❌', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: 'Une erreur est survenue lors de la mise à jour des préférences',
    };
  }
}

/** Suppression logique du compte : les votes et commandes restent traçables. */
export async function deleteUserAccount(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({
        deleted: true,
        disabled: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) throw new Error(error.message);

    return { success: true, message: 'Compte supprimé avec succès' };
  } catch (error) {
    console.error('[DELETE ACCOUNT] ❌', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la suppression du compte',
    };
  }
}
